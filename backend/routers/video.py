"""Video upload and analysis endpoints."""
import asyncio
import base64
import json
import logging
import os
import uuid
from typing import Dict

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from core.config import settings
from core.websocket_manager import manager as ws_manager
from models.database import get_db
from schemas.schemas import AnalysisStatus, VideoAnalysisResult, VideoUploadResponse
from services.fall_detector import FallDetector
from services.motion_analyzer import MotionAnalyzer, PoseFrame
from services.pose_estimator import (
    draw_skeleton, estimate_pose, get_body_angle, get_center_of_mass
)
from services.video_processor import (
    bgr_to_rgb, decode_base64_frame, frame_to_jpeg_bytes,
    get_video_metadata, normalize_frame, extract_frames,
)
from services.alert_manager import alert_manager

router = APIRouter(prefix="/api/video", tags=["video"])
logger = logging.getLogger(__name__)

# In-memory job registry (video_id → status dict)
_jobs: Dict[str, dict] = {}

# Per-session detectors for uploaded video analysis
_detectors: Dict[str, FallDetector] = {}
_analyzers: Dict[str, MotionAnalyzer] = {}


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(file: UploadFile = File(...)):
    """Accept a video file upload and store it for analysis."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in settings.allowed_video_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {settings.allowed_video_extensions}",
        )

    video_id = str(uuid.uuid4())
    dest_path = os.path.join(settings.upload_dir, f"{video_id}{ext}")

    size = 0
    async with aiofiles.open(dest_path, "wb") as out:
        while chunk := await file.read(1024 * 256):  # 256 KB chunks
            await out.write(chunk)
            size += len(chunk)
            if size > settings.max_upload_size_mb * 1024 * 1024:
                await out.close()
                os.remove(dest_path)
                raise HTTPException(status_code=413, detail="File too large")

    _jobs[video_id] = {
        "status": "pending",
        "progress": 0.0,
        "stage": "Queued",
        "message": "Upload complete. Ready to analyse.",
        "path": dest_path,
        "filename": file.filename,
        "result": None,
    }

    logger.info("Video uploaded  video_id=%s  size=%d bytes", video_id, size)
    return VideoUploadResponse(
        video_id=video_id,
        filename=file.filename or "video",
        size_bytes=size,
        message="Upload successful. Use /api/video/analyze/{video_id} to start analysis.",
    )


# ── Analysis ──────────────────────────────────────────────────────────────────

@router.post("/analyze/{video_id}", response_model=AnalysisStatus)
async def start_analysis(video_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Kick off background analysis of an uploaded video."""
    job = _jobs.get(video_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video not found")
    if job["status"] == "processing":
        raise HTTPException(status_code=409, detail="Analysis already in progress")

    job["status"] = "processing"
    job["progress"] = 0.0
    job["stage"] = "Initialising"

    background_tasks.add_task(_run_analysis, video_id)

    return AnalysisStatus(
        video_id=video_id,
        status="processing",
        progress=0.0,
        stage="Initialising",
        message="Analysis started.",
    )


@router.get("/status/{video_id}", response_model=AnalysisStatus)
def get_status(video_id: str):
    """Poll analysis job status."""
    job = _jobs.get(video_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video not found")
    return AnalysisStatus(
        video_id=video_id,
        status=job["status"],
        progress=job["progress"],
        stage=job["stage"],
        message=job["message"],
    )


@router.get("/results/{video_id}", response_model=VideoAnalysisResult)
def get_results(video_id: str):
    """Retrieve completed analysis results."""
    job = _jobs.get(video_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video not found")
    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail=f"Analysis not complete (status={job['status']})")
    return job["result"]


# ── Webcam stream ─────────────────────────────────────────────────────────────

_stream_active: bool = False
_stream_detector: FallDetector = FallDetector()
_stream_analyzer: MotionAnalyzer = MotionAnalyzer()


@router.post("/stream/start")
def start_stream():
    """Signal that the client will begin sending webcam frames."""
    global _stream_active
    _stream_active = True
    _stream_detector.reset()
    _stream_analyzer.reset()
    return {"status": "streaming", "message": "Webcam stream processing started"}


@router.post("/stream/stop")
def stop_stream():
    """Stop webcam stream processing."""
    global _stream_active
    _stream_active = False
    return {"status": "idle", "message": "Webcam stream stopped"}


@router.get("/stream/status")
def stream_status():
    return {"active": _stream_active}


# ── Background analysis worker ────────────────────────────────────────────────

async def _run_analysis(video_id: str) -> None:
    """Background task that runs the full detection pipeline on a video file."""
    job = _jobs[video_id]
    path = job["path"]
    filename = job["filename"]

    try:
        meta = get_video_metadata(path)
        total_frames = meta.get("total_frames", 1)
        duration = meta.get("duration_seconds", 0)

        detector = FallDetector()
        analyzer = MotionAnalyzer()

        frame_results = []
        event_ids = []
        processed = 0
        fall_count = 0
        confidence_sum = 0.0

        stages = [
            "Frame Extraction",
            "Pose Estimation",
            "Motion Analysis",
            "Classification",
        ]

        fps_target = settings.default_fps_target

        # Run frame processing in a thread to avoid blocking the event loop
        def _process_frames():
            nonlocal processed, fall_count, confidence_sum
            for frame_num, ts_ms, bgr_frame in extract_frames(path, fps_target):
                if job["status"] != "processing":
                    break

                norm = normalize_frame(bgr_frame)
                rgb = bgr_to_rgb(norm)

                # Stage 1 → 2: pose estimation
                stage_pct = (processed / max(1, total_frames / fps_target * fps_target)) * 100
                job["stage"] = stages[1]
                job["progress"] = min(stage_pct, 95.0)

                kp = estimate_pose(rgb)
                if not kp:
                    processed += 1
                    continue

                angle = get_body_angle(kp)
                cx, cy = get_center_of_mass(kp)

                pose_frame = PoseFrame(
                    timestamp_ms=ts_ms,
                    body_angle=angle,
                    com_x=cx,
                    com_y=cy,
                    keypoints=kp,
                )
                analyzer.push(pose_frame)
                features = analyzer.get_features()

                result = detector.classify_motion(features)
                confidence = result["confidence"]
                is_fall = result["is_fall"]
                confidence_sum += confidence

                # Generate annotated thumbnail
                annotated = draw_skeleton(norm, kp)
                thumb_bytes = frame_to_jpeg_bytes(annotated, quality=50)
                thumb_b64 = base64.b64encode(thumb_bytes).decode()

                frame_results.append({
                    "frame_number": frame_num,
                    "timestamp_ms": ts_ms,
                    "is_fall": is_fall,
                    "confidence": confidence,
                    "body_angle": angle,
                    "thumbnail_b64": thumb_b64 if is_fall else None,
                })

                if is_fall:
                    fall_count += 1

                processed += 1

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _process_frames)

        # Persist fall events
        for fr in frame_results:
            if fr["is_fall"]:
                eid = await alert_manager.trigger_alert(
                    confidence=fr["confidence"],
                    body_angle=fr["body_angle"],
                    frame_id=fr["frame_number"],
                    source="upload",
                    video_filename=filename,
                )
                event_ids.append(eid)

        overall_conf = confidence_sum / max(1, processed)

        from schemas.schemas import FrameResult, VideoAnalysisResult as VAR
        job["result"] = VAR(
            video_id=video_id,
            total_frames=total_frames,
            processed_frames=processed,
            falls_detected=fall_count,
            overall_confidence=round(overall_conf, 1),
            duration_seconds=round(duration, 1),
            frame_results=[
                FrameResult(**{k: v for k, v in fr.items()}) for fr in frame_results
            ],
            event_ids=event_ids,
        )
        job["status"] = "complete"
        job["progress"] = 100.0
        job["stage"] = "Complete"
        job["message"] = f"Analysis complete. {fall_count} fall(s) detected."
        logger.info("Analysis complete  video_id=%s  falls=%d", video_id, fall_count)

    except Exception as exc:
        logger.exception("Analysis failed  video_id=%s", video_id)
        job["status"] = "error"
        job["message"] = str(exc)
