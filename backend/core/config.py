"""Application configuration — single source of truth for all tuneable parameters."""
import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class Settings:
    # ── Identity ──────────────────────────────────────────────────
    app_name: str = "Guardian Eye — AI Fall Detection System"
    api_version: str = "1.0.0"
    debug: bool = True

    # ── Database ──────────────────────────────────────────────────
    database_url: str = "sqlite:///./guardian_eye.db"

    # ── File upload ───────────────────────────────────────────────
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 500
    allowed_video_extensions: List[str] = field(
        default_factory=lambda: [".mp4", ".avi", ".mov", ".mkv", ".webm"]
    )

    # ── Detection defaults ────────────────────────────────────────
    default_confidence_threshold: float = 70.0   # score to declare a fall
    default_fps_target: int = 15                 # frames per second for analysis
    fall_cooldown_seconds: int = 10              # silence window after each alert
    min_fall_frames: int = 5                     # consecutive high-score frames needed
    sliding_window_size: int = 30               # pose history window

    # ── Motion thresholds ─────────────────────────────────────────
    velocity_threshold: float = 0.08            # normalised CoM units/frame
    acceleration_threshold: float = 0.05
    com_drop_threshold: float = 0.15            # normalised Y drop

    # ── Demo mode ─────────────────────────────────────────────────
    demo_mode: bool = False
    demo_fall_interval_seconds: int = 45
    demo_seed_count: int = 50

    # ── CORS ──────────────────────────────────────────────────────
    cors_origins: List[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
    )

    # ── WebSocket ─────────────────────────────────────────────────
    ws_health_interval_seconds: int = 5

    def __post_init__(self):
        os.makedirs(self.upload_dir, exist_ok=True)


settings = Settings()
