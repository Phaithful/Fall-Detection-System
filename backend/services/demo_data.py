"""
Demo data service.

Seeds the database with 50 synthetic fall/non-fall events spanning the
last 30 days and simulates a live WebSocket stream for demonstration.
"""
import asyncio
import json
import logging
import math
import random
import time
from datetime import datetime, timedelta
from typing import Any, Dict

import psutil

from models.database import Event, PerformanceLog, SessionLocal
from core.websocket_manager import manager as ws_manager

logger = logging.getLogger(__name__)

_demo_task: asyncio.Task = None
_demo_running: bool = False


# ── Database seeding ──────────────────────────────────────────────────────────

def seed_demo_events(count: int = 50, force: bool = False) -> int:
    """
    Populate the database with synthetic events.
    Skips if events already exist (unless force=True).
    Returns number of events inserted.
    """
    db = SessionLocal()
    try:
        existing = db.query(Event).count()
        if existing >= count and not force:
            logger.info("Demo data already present (%d events). Skipping seed.", existing)
            return 0

        if force:
            db.query(Event).delete()
            db.query(PerformanceLog).delete()
            db.commit()

        inserted = 0
        now = datetime.utcnow()

        for i in range(count):
            is_fall = random.random() < 0.40   # 40% falls
            days_ago = random.uniform(0, 30)
            ts = now - timedelta(days=days_ago)
            source = random.choice(["webcam", "upload", "demo"])

            if is_fall:
                confidence = random.uniform(72, 97)
                body_angle = random.uniform(55, 88)
                velocity = random.uniform(0.10, 0.25)
                acceleration = random.uniform(0.08, 0.18)
            else:
                confidence = random.uniform(5, 45)
                body_angle = random.uniform(2, 35)
                velocity = random.uniform(0.0, 0.06)
                acceleration = random.uniform(0.0, 0.04)

            status = random.choice(["unreviewed", "confirmed", "false_alarm"])
            if is_fall and status == "false_alarm":
                status = "confirmed"

            keypoints = _generate_keypoints(body_angle)

            event = Event(
                timestamp=ts,
                source=source,
                video_filename=f"demo_clip_{i:03d}.mp4" if source == "upload" else None,
                is_fall=is_fall,
                confidence=round(confidence, 1),
                body_angle=round(body_angle, 1),
                velocity=round(velocity, 4),
                acceleration=round(acceleration, 4),
                frame_number=random.randint(50, 500),
                keypoints_json=json.dumps(keypoints),
                status=status,
            )
            db.add(event)
            inserted += 1

        # Seed 200 performance log entries
        for j in range(200):
            hours_ago = random.uniform(0, 72)
            ts = now - timedelta(hours=hours_ago)
            db.add(PerformanceLog(
                timestamp=ts,
                fps=random.uniform(12, 28),
                cpu_usage=random.uniform(15, 65),
                memory_usage=random.uniform(35, 75),
                detection_latency_ms=random.uniform(20, 80),
            ))

        db.commit()
        logger.info("Seeded %d demo events + 200 performance logs.", inserted)
        return inserted
    finally:
        db.close()


# ── Live simulation ───────────────────────────────────────────────────────────

async def start_demo_stream(fall_interval: int = 45) -> None:
    """Start the background demo WebSocket stream."""
    global _demo_task, _demo_running
    if _demo_running:
        return
    _demo_running = True
    _demo_task = asyncio.create_task(_demo_loop(fall_interval))
    logger.info("Demo stream started (fall every ~%ds)", fall_interval)


async def stop_demo_stream() -> None:
    """Stop the background demo stream."""
    global _demo_task, _demo_running
    _demo_running = False
    if _demo_task:
        _demo_task.cancel()
        _demo_task = None
    logger.info("Demo stream stopped.")


async def _demo_loop(fall_interval: int) -> None:
    """Coroutine that emits synthetic WebSocket messages indefinitely."""
    frame_id = 0
    last_health = time.monotonic()
    last_fall = time.monotonic()
    phase = 0.0   # for smooth sinusoidal body angle oscillation

    while _demo_running:
        frame_id += 1
        phase += 0.08
        now = time.monotonic()

        # Simulate a fall every fall_interval seconds
        is_fall_frame = (now - last_fall) >= fall_interval
        if is_fall_frame:
            await _emit_fall(frame_id)
            last_fall = now
            # Reset phase after fall
            phase = 0.0
            await asyncio.sleep(2)
            continue

        # Normal pose oscillation (gentle sway)
        body_angle = 5 + 8 * abs(math.sin(phase))
        com_y = 0.52 + 0.02 * math.sin(phase * 0.5)
        velocity = 0.01 + 0.005 * abs(math.cos(phase))
        confidence = max(0.0, 15 + 10 * abs(math.sin(phase)) - random.uniform(0, 5))

        keypoints = _generate_keypoints(body_angle)

        pose_msg: Dict[str, Any] = {
            "type": "pose_update",
            "frame_id": frame_id,
            "keypoints": keypoints,
            "body_angle": round(body_angle, 2),
            "com_y": round(com_y, 4),
            "velocity": round(velocity, 4),
            "confidence": round(confidence, 1),
        }
        await ws_manager.broadcast(pose_msg)

        # Emit health every 5 seconds
        if now - last_health >= 5:
            proc = psutil.Process()
            health_msg = {
                "type": "system_health",
                "fps": round(random.uniform(22, 28), 1),
                "cpu": round(psutil.cpu_percent(interval=None), 1),
                "memory": round(proc.memory_percent(), 1),
                "latency_ms": round(random.uniform(25, 55), 1),
            }
            await ws_manager.broadcast(health_msg)
            last_health = now

        await asyncio.sleep(1 / 15)   # ~15 FPS


async def _emit_fall(frame_id: int) -> None:
    """Emit a simulated fall detection sequence via WebSocket."""
    confidence = round(random.uniform(78, 96), 1)
    body_angle = round(random.uniform(58, 85), 1)

    # Save to DB
    from services.alert_manager import alert_manager
    event_id = await alert_manager.trigger_alert(
        confidence=confidence,
        body_angle=body_angle,
        frame_id=frame_id,
        source="demo",
        velocity=round(random.uniform(0.12, 0.22), 4),
        acceleration=round(random.uniform(0.09, 0.16), 4),
        keypoints=_generate_keypoints(body_angle),
    )
    logger.info("Demo fall emitted  event_id=%d  confidence=%.1f%%", event_id, confidence)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_keypoints(body_angle_deg: float) -> Dict[str, list]:
    """
    Generate plausible normalised keypoints for a given body angle.
    0° = upright, 90° = horizontal (fallen).
    """
    angle_rad = math.radians(body_angle_deg)
    sin_a = math.sin(angle_rad)
    cos_a = math.cos(angle_rad)

    # Base skeleton in upright position (normalised coords)
    spine_dx = sin_a * 0.20
    spine_dy = cos_a * 0.20

    cx, cy = 0.50, 0.55   # hip centre
    shoulder_x = cx + spine_dx
    shoulder_y = cy - spine_dy

    noise = lambda: random.gauss(0, 0.005)

    return {
        "nose": [shoulder_x + noise(), shoulder_y - 0.15 + noise(), 0.0, 0.99],
        "left_shoulder": [shoulder_x - 0.06 + noise(), shoulder_y + noise(), 0.0, 0.99],
        "right_shoulder": [shoulder_x + 0.06 + noise(), shoulder_y + noise(), 0.0, 0.99],
        "left_elbow": [shoulder_x - 0.10 + noise(), shoulder_y + 0.10 + noise(), 0.0, 0.95],
        "right_elbow": [shoulder_x + 0.10 + noise(), shoulder_y + 0.10 + noise(), 0.0, 0.95],
        "left_wrist": [shoulder_x - 0.12 + noise(), shoulder_y + 0.20 + noise(), 0.0, 0.90],
        "right_wrist": [shoulder_x + 0.12 + noise(), shoulder_y + 0.20 + noise(), 0.0, 0.90],
        "left_hip": [cx - 0.05 + noise(), cy + noise(), 0.0, 0.99],
        "right_hip": [cx + 0.05 + noise(), cy + noise(), 0.0, 0.99],
        "left_knee": [cx - 0.06 + noise(), cy + 0.15 + noise(), 0.0, 0.98],
        "right_knee": [cx + 0.06 + noise(), cy + 0.15 + noise(), 0.0, 0.98],
        "left_ankle": [cx - 0.07 + noise(), cy + 0.30 + noise(), 0.0, 0.97],
        "right_ankle": [cx + 0.07 + noise(), cy + 0.30 + noise(), 0.0, 0.97],
    }
