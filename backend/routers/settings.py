"""Settings CRUD endpoints."""
import json
import logging

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import AppSetting, Event, get_db
from schemas.schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])
logger = logging.getLogger(__name__)


def _read_all(db: Session) -> dict:
    rows = db.query(AppSetting).all()
    return {row.key: row.value for row in rows}


def _coerce(settings_dict: dict) -> SettingsRead:
    def _bool(v: str) -> bool:
        return v.lower() in ("true", "1", "yes")

    return SettingsRead(
        confidence_threshold=float(settings_dict.get("confidence_threshold", 70.0)),
        fps_target=int(settings_dict.get("fps_target", 15)),
        detection_mode=settings_dict.get("detection_mode", "realtime"),
        camera_device=settings_dict.get("camera_device", "0"),
        camera_resolution=settings_dict.get("camera_resolution", "640x480"),
        audio_alerts=_bool(settings_dict.get("audio_alerts", "true")),
        visual_flash=_bool(settings_dict.get("visual_flash", "true")),
        alert_cooldown=int(settings_dict.get("alert_cooldown", 10)),
        max_stored_events=int(settings_dict.get("max_stored_events", 1000)),
        auto_delete_old=_bool(settings_dict.get("auto_delete_old", "false")),
        demo_mode=_bool(settings_dict.get("demo_mode", "false")),
        sensitivity=settings_dict.get("sensitivity", "medium"),
    )


@router.get("", response_model=SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    """Return all current application settings."""
    raw = _read_all(db)
    return _coerce(raw)


@router.put("", response_model=SettingsRead)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
):
    """Update one or more settings values."""
    updates = payload.model_dump(exclude_none=True)

    for key, val in updates.items():
        row = db.query(AppSetting).filter_by(key=key).first()
        if row:
            row.value = str(val).lower() if isinstance(val, bool) else str(val)
        else:
            db.add(AppSetting(key=key, value=str(val)))

    db.commit()

    # If demo_mode changed, start/stop the demo stream
    if "demo_mode" in updates:
        import asyncio
        from services.demo_data import start_demo_stream, stop_demo_stream
        try:
            loop = asyncio.get_event_loop()
            if updates["demo_mode"]:
                loop.create_task(start_demo_stream())
            else:
                loop.create_task(stop_demo_stream())
        except RuntimeError:
            pass  # no running loop in sync context

    raw = _read_all(db)
    return _coerce(raw)


@router.post("/ml/retrain")
def retrain_ml_model(db: Session = Depends(get_db)):
    """
    Retrain the fall classifier, augmenting synthetic data with real stored events.
    Events need a velocity + body_angle stored to contribute a useful feature vector.
    """
    from ml.trainer import train_and_save
    from ml.classifier import invalidate_cache

    events = db.query(Event).all()
    extra_X, extra_y = [], []

    for ev in events:
        try:
            vel   = float(ev.velocity   or 0.0)
            accel = float(ev.acceleration or 0.0)
            angle = float(ev.body_angle or 0.0)

            com_y_drop = 0.0
            angle_rate = 0.0
            if ev.keypoints_json:
                kp_data = json.loads(ev.keypoints_json) if isinstance(ev.keypoints_json, str) else ev.keypoints_json
                if isinstance(kp_data, dict) and "com_y_drop" in kp_data:
                    com_y_drop = float(kp_data.get("com_y_drop", 0.0))
                    angle_rate = float(kp_data.get("angle_change_rate", 0.0))

            extra_X.append([angle, vel, accel, com_y_drop, angle_rate, vel, accel, 0.5])
            extra_y.append(1 if ev.is_fall else 0)
        except Exception:
            continue

    extra_X_arr = np.array(extra_X) if extra_X else np.empty((0, 8))
    extra_y_arr = np.array(extra_y, dtype=int) if extra_y else np.empty(0, dtype=int)

    try:
        metrics = train_and_save(extra_X=extra_X_arr, extra_y=extra_y_arr)
        invalidate_cache()
        return {"status": "ok", "real_samples": len(extra_X), **metrics}
    except Exception as exc:
        logger.exception("ML retrain failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
