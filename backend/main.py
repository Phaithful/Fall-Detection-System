"""
Guardian Eye — AI Fall Detection System
FastAPI application entry point.
"""
import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

import psutil
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.websocket_manager import manager as ws_manager
from models.database import AppSetting, SessionLocal, create_tables, seed_default_settings
from routers import analytics, events, settings as settings_router, system, video
from services.alert_manager import alert_manager
from services.demo_data import seed_demo_events, start_demo_stream
from services.fall_detector import FallDetector
from services.motion_analyzer import MotionAnalyzer, PoseFrame
from services.pose_estimator import get_body_angle, get_center_of_mass, estimate_pose
from services.video_processor import decode_base64_frame, bgr_to_rgb, normalize_frame

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# Per-WebSocket fall detectors and motion analyzers
_ws_detectors: dict = {}
_ws_analyzers: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle manager."""
    logger.info("═" * 60)
    logger.info("  Guardian Eye Backend  v%s  starting…", settings.api_version)
    logger.info("═" * 60)

    create_tables()
    db = SessionLocal()
    seed_default_settings(db)

    # Check demo_mode setting
    row = db.query(AppSetting).filter_by(key="demo_mode").first()
    demo_on = row and row.value.lower() in ("true", "1")
    db.close()

    # Ensure ML classifier is trained (no-op if .pkl already exists)
    try:
        from ml.classifier import ensure_model_trained
        ensure_model_trained()
    except Exception as exc:
        logger.warning("ML classifier training skipped: %s", exc)

    # Always seed demo data on first run
    seed_demo_events(count=50)

    if demo_on:
        await start_demo_stream(fall_interval=settings.demo_fall_interval_seconds)

    # Background system-health broadcaster
    health_task = asyncio.create_task(_health_broadcaster())

    logger.info("Backend ready.  CORS origins: %s", settings.cors_origins)
    yield

    health_task.cancel()
    logger.info("Guardian Eye Backend shut down.")


app = FastAPI(
    title=settings.app_name,
    version=settings.api_version,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(video.router)
app.include_router(events.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)
app.include_router(system.router)


# ── REST health ───────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "system": settings.app_name, "version": settings.api_version}


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@app.websocket("/ws/detection")
async def detection_websocket(websocket: WebSocket):
    """
    Bidirectional WebSocket.

    Client → Server messages:
        {"type": "frame", "data": "<base64-jpeg>", "timestamp": <ms>}
        {"type": "ping"}

    Server → Client messages:
        pose_update, fall_detected, system_health  (see schemas.py)
    """
    client_id = str(uuid.uuid4())
    await ws_manager.connect(websocket, client_id)

    detector = FallDetector(
        confidence_threshold=settings.default_confidence_threshold,
        min_fall_frames=settings.min_fall_frames,
        cooldown_seconds=float(settings.fall_cooldown_seconds),
        velocity_threshold=settings.velocity_threshold,
        acceleration_threshold=settings.acceleration_threshold,
        com_drop_threshold=settings.com_drop_threshold,
    )
    analyzer = MotionAnalyzer(window_size=settings.sliding_window_size)
    _ws_detectors[client_id] = detector
    _ws_analyzers[client_id] = analyzer

    frame_id = 0
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type", "")

            if msg_type == "ping":
                await ws_manager.send_json(client_id, {"type": "pong"})
                continue

            if msg_type == "frame":
                frame_id += 1
                t_start = time.monotonic()

                b64 = msg.get("data", "")
                ts_ms = float(msg.get("timestamp", frame_id * (1000 / 15)))

                # Run CPU-heavy decode + inference in a thread pool so the
                # asyncio event loop stays free to receive the next frame.
                def _infer(b64_data: str):
                    bgr = decode_base64_frame(b64_data)
                    bgr = normalize_frame(bgr)
                    rgb = bgr_to_rgb(bgr)
                    return estimate_pose(rgb)

                try:
                    loop = asyncio.get_event_loop()
                    kp = await loop.run_in_executor(None, _infer, b64)
                except Exception as exc:
                    logger.warning("Frame decode/pose error: %s", exc)
                    continue

                if not kp:
                    continue

                angle = get_body_angle(kp)
                com_x, com_y = get_center_of_mass(kp)

                analyzer.push(PoseFrame(
                    timestamp_ms=ts_ms,
                    body_angle=angle,
                    com_x=com_x,
                    com_y=com_y,
                    keypoints=kp,
                ))
                features = analyzer.get_features()
                result = detector.classify_motion(features)

                latency_ms = (time.monotonic() - t_start) * 1000

                pose_msg = {
                    "type": "pose_update",
                    "frame_id": frame_id,
                    "keypoints": kp,
                    "body_angle": angle,
                    "com_y": com_y,
                    "velocity": features.get("velocity", 0.0),
                    "confidence": result["confidence"],
                }
                await ws_manager.send_json(client_id, pose_msg)

                if result["is_fall"]:
                    event_id = await alert_manager.trigger_alert(
                        confidence=result["confidence"],
                        body_angle=angle,
                        frame_id=frame_id,
                        source="webcam",
                        velocity=features.get("velocity", 0.0),
                        acceleration=features.get("acceleration", 0.0),
                        keypoints=kp,
                    )
                    fall_msg = {
                        "type": "fall_detected",
                        "event_id": event_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "confidence": result["confidence"],
                        "body_angle": angle,
                        "frame_id": frame_id,
                    }
                    await ws_manager.send_json(client_id, fall_msg)

            elif msg_type == "update_settings":
                threshold = msg.get("confidence_threshold")
                if threshold is not None:
                    detector.update_thresholds(confidence_threshold=float(threshold))

    except WebSocketDisconnect:
        logger.info("Client disconnected: %s", client_id)
    except Exception as exc:
        logger.exception("WebSocket error for %s: %s", client_id, exc)
    finally:
        await ws_manager.disconnect(client_id)
        _ws_detectors.pop(client_id, None)
        _ws_analyzers.pop(client_id, None)


# ── Background tasks ──────────────────────────────────────────────────────────
async def _health_broadcaster():
    """Broadcast system health metrics to all connected clients every 5 s."""
    proc = psutil.Process()
    while True:
        await asyncio.sleep(settings.ws_health_interval_seconds)
        if ws_manager.connection_count == 0:
            continue
        try:
            health = {
                "type": "system_health",
                "fps": 0.0,   # updated per-client via frame timing
                "cpu": round(psutil.cpu_percent(interval=None), 1),
                "memory": round(proc.memory_percent(), 1),
                "latency_ms": 0.0,
            }
            await ws_manager.broadcast(health)
            # Persist performance snapshot
            await alert_manager.record_performance(
                fps=0.0,
                cpu_usage=health["cpu"],
                memory_usage=health["memory"],
                latency_ms=0.0,
            )
        except Exception as exc:
            logger.debug("Health broadcast error: %s", exc)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info",
    )
