"""Video processing service — frame extraction and preprocessing."""
import logging
import os
from typing import Generator, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def extract_frames(
    video_path: str,
    fps_target: int = 15,
    max_frames: Optional[int] = None,
) -> Generator[Tuple[int, float, np.ndarray], None, None]:
    """
    Yield (frame_number, timestamp_ms, frame_bgr) from a video file at a
    specified target FPS.  Skips frames to match fps_target without loading
    the entire video into memory.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    source_fps: float = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, round(source_fps / fps_target))

    frame_index = 0
    yielded = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_index % frame_interval == 0:
                timestamp_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
                yield frame_index, timestamp_ms, frame
                yielded += 1
                if max_frames and yielded >= max_frames:
                    break

            frame_index += 1
    finally:
        cap.release()

    logger.debug("Extracted %d frames from %s", yielded, video_path)


def get_video_metadata(video_path: str) -> dict:
    """Return basic metadata for a video file."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {}
    meta = {
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "duration_seconds": cap.get(cv2.CAP_PROP_FRAME_COUNT) / (cap.get(cv2.CAP_PROP_FPS) or 1),
    }
    cap.release()
    return meta


def normalize_frame(frame: np.ndarray, target_width: int = 640) -> np.ndarray:
    """Resize frame to a standard width while preserving aspect ratio."""
    h, w = frame.shape[:2]
    if w == target_width:
        return frame
    scale = target_width / w
    new_h = int(h * scale)
    return cv2.resize(frame, (target_width, new_h), interpolation=cv2.INTER_AREA)


def bgr_to_rgb(frame: np.ndarray) -> np.ndarray:
    """Convert BGR (OpenCV default) to RGB (MediaPipe / PIL expected)."""
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)


def frame_to_jpeg_bytes(frame: np.ndarray, quality: int = 75) -> bytes:
    """Encode a BGR frame to JPEG bytes."""
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise RuntimeError("JPEG encoding failed")
    return buf.tobytes()


def decode_base64_frame(b64_data: str) -> np.ndarray:
    """Decode a base64-encoded JPEG/PNG string to a BGR numpy array."""
    import base64
    # Strip data-URL prefix if present
    if "," in b64_data:
        b64_data = b64_data.split(",", 1)[1]
    raw = base64.b64decode(b64_data)
    arr = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode base64 frame")
    return frame


def apply_background_subtraction(
    frame: np.ndarray,
    bg_subtractor: cv2.BackgroundSubtractor,
) -> np.ndarray:
    """Apply MOG2 background subtraction; returns foreground mask."""
    mask = bg_subtractor.apply(frame)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    return mask


def create_bg_subtractor() -> cv2.BackgroundSubtractor:
    """Create a pre-configured MOG2 background subtractor."""
    return cv2.createBackgroundSubtractorMOG2(
        history=200, varThreshold=25, detectShadows=False
    )
