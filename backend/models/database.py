"""SQLAlchemy ORM models and database engine setup."""
import json
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, Integer, String, Text, create_engine
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from core.config import settings


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite specific
    echo=False,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


# ── ORM Models ────────────────────────────────────────────────────────────────

class Event(Base):
    """A single detection event — fall or non-fall."""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    source = Column(String(20), default="webcam")           # 'webcam' | 'upload' | 'demo'
    video_filename = Column(String(255), nullable=True)
    is_fall = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)
    body_angle = Column(Float, default=0.0)
    velocity = Column(Float, default=0.0)
    acceleration = Column(Float, default=0.0)
    frame_number = Column(Integer, default=0)
    keypoints_json = Column(Text, nullable=True)            # JSON blob
    status = Column(String(20), default="unreviewed")       # 'unreviewed' | 'confirmed' | 'false_alarm'

    def keypoints_dict(self):
        if self.keypoints_json:
            return json.loads(self.keypoints_json)
        return {}


class PerformanceLog(Base):
    """Periodic system performance snapshot."""
    __tablename__ = "performance_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    fps = Column(Float, default=0.0)
    cpu_usage = Column(Float, default=0.0)
    memory_usage = Column(Float, default=0.0)
    detection_latency_ms = Column(Float, default=0.0)


class AppSetting(Base):
    """Key-value application settings store."""
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_db():
    """FastAPI dependency that provides a database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables (called at startup)."""
    Base.metadata.create_all(bind=engine)


def seed_default_settings(db: Session):
    """Ensure default settings rows exist."""
    defaults = {
        "confidence_threshold": "70.0",
        "fps_target": "15",
        "detection_mode": "realtime",
        "camera_device": "0",
        "camera_resolution": "640x480",
        "audio_alerts": "true",
        "visual_flash": "true",
        "alert_cooldown": "10",
        "max_stored_events": "1000",
        "auto_delete_old": "false",
        "demo_mode": "false",
        "sensitivity": "medium",
    }
    for key, value in defaults.items():
        existing = db.query(AppSetting).filter_by(key=key).first()
        if not existing:
            db.add(AppSetting(key=key, value=value))
    db.commit()
