"""Alert manager — logs fall events and broadcasts real-time alerts via WebSocket."""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from models.database import Event, PerformanceLog, SessionLocal
from core.websocket_manager import manager as ws_manager

logger = logging.getLogger(__name__)


class AlertManager:
    """Coordinates event persistence and WebSocket alert broadcasting."""

    def __init__(self):
        self._recent_alerts: List[Dict[str, Any]] = []
        self._max_recent = 50

    # ── Public API ────────────────────────────────────────────────────────────

    async def trigger_alert(
        self,
        confidence: float,
        body_angle: float,
        frame_id: int,
        source: str = "webcam",
        video_filename: Optional[str] = None,
        velocity: float = 0.0,
        acceleration: float = 0.0,
        keypoints: Optional[Dict] = None,
    ) -> int:
        """Persist a fall event to the DB and broadcast it to all WS clients."""
        event_id = await asyncio.get_event_loop().run_in_executor(
            None,
            self._log_event_sync,
            confidence, body_angle, frame_id,
            source, video_filename, velocity, acceleration, keypoints,
        )

        alert_payload = {
            "type": "fall_detected",
            "event_id": event_id,
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": confidence,
            "body_angle": body_angle,
            "frame_id": frame_id,
            "source": source,
        }

        self._push_recent(alert_payload)
        await ws_manager.broadcast(alert_payload)
        logger.warning("ALERT broadcast  event_id=%d  confidence=%.1f%%", event_id, confidence)
        return event_id

    async def log_non_fall_event(
        self,
        confidence: float,
        body_angle: float,
        frame_id: int,
        source: str = "webcam",
        video_filename: Optional[str] = None,
        velocity: float = 0.0,
        acceleration: float = 0.0,
    ) -> int:
        """Persist a non-fall detection event (for record-keeping)."""
        return await asyncio.get_event_loop().run_in_executor(
            None,
            self._log_event_sync,
            confidence, body_angle, frame_id,
            source, video_filename, velocity, acceleration, None,
            False,   # is_fall
        )

    async def record_performance(
        self,
        fps: float,
        cpu_usage: float,
        memory_usage: float,
        latency_ms: float,
    ) -> None:
        """Persist a performance snapshot."""
        await asyncio.get_event_loop().run_in_executor(
            None,
            self._log_performance_sync,
            fps, cpu_usage, memory_usage, latency_ms,
        )

    def get_recent_alerts(self, n: int = 20) -> List[Dict[str, Any]]:
        """Return the N most recent alert records (in-memory cache)."""
        return self._recent_alerts[-n:]

    # ── Sync helpers (run in thread pool) ────────────────────────────────────

    def _log_event_sync(
        self,
        confidence: float,
        body_angle: float,
        frame_id: int,
        source: str,
        video_filename: Optional[str],
        velocity: float,
        acceleration: float,
        keypoints: Optional[Dict],
        is_fall: bool = True,
    ) -> int:
        db: Session = SessionLocal()
        try:
            event = Event(
                source=source,
                video_filename=video_filename,
                is_fall=is_fall,
                confidence=confidence,
                body_angle=body_angle,
                velocity=velocity,
                acceleration=acceleration,
                frame_number=frame_id,
                keypoints_json=json.dumps(keypoints) if keypoints else None,
            )
            db.add(event)
            db.commit()
            db.refresh(event)
            return event.id
        finally:
            db.close()

    def _log_performance_sync(
        self,
        fps: float,
        cpu_usage: float,
        memory_usage: float,
        latency_ms: float,
    ) -> None:
        db: Session = SessionLocal()
        try:
            log = PerformanceLog(
                fps=fps,
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                detection_latency_ms=latency_ms,
            )
            db.add(log)
            db.commit()
        finally:
            db.close()

    def _push_recent(self, alert: Dict[str, Any]) -> None:
        self._recent_alerts.append(alert)
        if len(self._recent_alerts) > self._max_recent:
            self._recent_alerts.pop(0)


# Singleton
alert_manager = AlertManager()
