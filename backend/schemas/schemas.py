"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Event schemas ─────────────────────────────────────────────────────────────

class EventBase(BaseModel):
    source: str = "webcam"
    video_filename: Optional[str] = None
    is_fall: bool = False
    confidence: float = 0.0
    body_angle: float = 0.0
    velocity: float = 0.0
    acceleration: float = 0.0
    frame_number: int = 0
    status: str = "unreviewed"


class EventCreate(EventBase):
    keypoints_json: Optional[str] = None


class EventRead(EventBase):
    id: int
    timestamp: datetime
    keypoints_json: Optional[str] = None

    model_config = {"from_attributes": True}


class EventList(BaseModel):
    items: List[EventRead]
    total: int
    page: int
    page_size: int


# ── Video upload / analysis schemas ───────────────────────────────────────────

class VideoUploadResponse(BaseModel):
    video_id: str
    filename: str
    size_bytes: int
    message: str


class AnalysisStatus(BaseModel):
    video_id: str
    status: str                    # 'pending' | 'processing' | 'complete' | 'error'
    progress: float = 0.0          # 0–100
    stage: str = ""                # current pipeline stage
    message: str = ""


class FrameResult(BaseModel):
    frame_number: int
    timestamp_ms: float
    is_fall: bool
    confidence: float
    body_angle: float
    thumbnail_b64: Optional[str] = None   # base64 annotated frame thumbnail


class VideoAnalysisResult(BaseModel):
    video_id: str
    total_frames: int
    processed_frames: int
    falls_detected: int
    overall_confidence: float
    duration_seconds: float
    frame_results: List[FrameResult]
    event_ids: List[int]


# ── Analytics schemas ─────────────────────────────────────────────────────────

class FallsOverTimePoint(BaseModel):
    period: str
    falls: int
    non_falls: int
    total: int


class ConfidenceDistPoint(BaseModel):
    bucket: str
    count: int


class PerformanceMetrics(BaseModel):
    avg_fps: float
    avg_cpu: float
    avg_memory: float
    avg_latency_ms: float
    samples: int


class AnalyticsSummary(BaseModel):
    total_events: int
    total_falls: int
    total_non_falls: int
    false_alarm_rate: float
    avg_confidence: float
    uptime_hours: float
    today_events: int
    today_falls: int


class HeatmapPoint(BaseModel):
    hour: int
    day: int
    count: int


# ── Settings schemas ──────────────────────────────────────────────────────────

class SettingsRead(BaseModel):
    confidence_threshold: float = 70.0
    fps_target: int = 15
    detection_mode: str = "realtime"
    camera_device: str = "0"
    camera_resolution: str = "640x480"
    audio_alerts: bool = True
    visual_flash: bool = True
    alert_cooldown: int = 10
    max_stored_events: int = 1000
    auto_delete_old: bool = False
    demo_mode: bool = False
    sensitivity: str = "medium"


class SettingsUpdate(BaseModel):
    confidence_threshold: Optional[float] = None
    fps_target: Optional[int] = None
    detection_mode: Optional[str] = None
    camera_device: Optional[str] = None
    camera_resolution: Optional[str] = None
    audio_alerts: Optional[bool] = None
    visual_flash: Optional[bool] = None
    alert_cooldown: Optional[int] = None
    max_stored_events: Optional[int] = None
    auto_delete_old: Optional[bool] = None
    demo_mode: Optional[bool] = None
    sensitivity: Optional[str] = None


# ── WebSocket message schemas ─────────────────────────────────────────────────

class PoseUpdate(BaseModel):
    type: str = "pose_update"
    frame_id: int
    keypoints: Dict[str, List[float]]
    body_angle: float
    com_y: float
    velocity: float
    confidence: float


class FallDetectedEvent(BaseModel):
    type: str = "fall_detected"
    event_id: int
    timestamp: str
    confidence: float
    body_angle: float
    frame_id: int


class SystemHealth(BaseModel):
    type: str = "system_health"
    fps: float
    cpu: float
    memory: float
    latency_ms: float


# ── System info ───────────────────────────────────────────────────────────────

class SystemInfo(BaseModel):
    backend_status: str
    api_version: str
    python_version: str
    opencv_version: str
    mediapipe_version: str
    platform: str
    cpu_count: int
    total_memory_gb: float
