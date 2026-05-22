"""
Pose estimation service — MediaPipe Tasks API (v0.10+).

The legacy mp.solutions.pose was removed in MediaPipe 0.10.20+.
This module uses the new PoseLandmarker Tasks API instead.
The model file (~25 MB) is downloaded automatically on first use.
"""
import logging
import math
import threading
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ── Model ─────────────────────────────────────────────────────────────────────
_MODEL_DIR  = Path(__file__).parent.parent / "models"
_MODEL_PATH = _MODEL_DIR / "pose_landmarker_full.task"
_MODEL_URL  = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"
)

_landmarker      = None
_landmarker_lock = threading.Lock()

# ── Landmark metadata ─────────────────────────────────────────────────────────
LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear",
    "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder",
    "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_pinky", "right_pinky",
    "left_index", "right_index",
    "left_thumb", "right_thumb",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle",
    "left_heel", "right_heel",
    "left_foot_index", "right_foot_index",
]

POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7),
    (0, 4), (4, 5), (5, 6), (6, 8),
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (25, 27), (27, 29), (29, 31),
    (24, 26), (26, 28), (28, 30), (30, 32),
]


# ── Internal helpers ──────────────────────────────────────────────────────────

def _ensure_model() -> bool:
    """Download the pose landmarker model if not already on disk."""
    _MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if _MODEL_PATH.exists():
        return True
    logger.info("[Pose] Downloading pose landmarker model (~25 MB) — first run only…")
    try:
        urllib.request.urlretrieve(_MODEL_URL, _MODEL_PATH)
        logger.info("[Pose] Model saved → %s", _MODEL_PATH)
        return True
    except Exception as exc:
        logger.error("[Pose] Model download failed: %s", exc)
        if _MODEL_PATH.exists():
            _MODEL_PATH.unlink()   # remove partial file
        return False


def _get_landmarker():
    """Lazy-initialise the PoseLandmarker (thread-safe)."""
    global _landmarker
    if _landmarker is not None:
        return _landmarker

    with _landmarker_lock:
        if _landmarker is not None:   # double-check after acquiring lock
            return _landmarker
        try:
            import mediapipe as mp
            from mediapipe.tasks import python as mp_python
            from mediapipe.tasks.python import vision as mp_vision

            if not _ensure_model():
                return None

            base_options = mp_python.BaseOptions(model_asset_path=str(_MODEL_PATH))
            options = mp_vision.PoseLandmarkerOptions(
                base_options=base_options,
                output_segmentation_masks=False,
                num_poses=1,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            _landmarker = mp_vision.PoseLandmarker.create_from_options(options)
            logger.info("[Pose] PoseLandmarker initialised (full model)")
        except Exception as exc:
            logger.warning("[Pose] Could not initialise PoseLandmarker: %s", exc)

    return _landmarker


# ── Public API ────────────────────────────────────────────────────────────────

def estimate_pose(rgb_frame: np.ndarray) -> Optional[Dict[str, List[float]]]:
    """
    Run MediaPipe pose estimation on an RGB frame.
    Returns a dict mapping landmark name → [x, y, z, visibility] in
    normalised [0, 1] coordinates, or None if no person detected.
    """
    import mediapipe as mp

    landmarker = _get_landmarker()
    if landmarker is None:
        return None

    try:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb_frame))
        with _landmarker_lock:
            result = landmarker.detect(mp_image)
    except Exception as exc:
        logger.debug("[Pose] Inference error: %s", exc)
        return None

    if not result.pose_landmarks:
        return None

    keypoints: Dict[str, List[float]] = {}
    for idx, lm in enumerate(result.pose_landmarks[0]):
        name = LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"landmark_{idx}"
        keypoints[name] = [
            round(lm.x, 4),
            round(lm.y, 4),
            round(lm.z, 4),
            round(getattr(lm, "visibility", 1.0), 4),
        ]
    return keypoints


def draw_skeleton(
    bgr_frame: np.ndarray,
    keypoints: Dict[str, List[float]],
    color: Tuple[int, int, int] = (0, 255, 100),
    dot_color: Tuple[int, int, int] = (255, 80, 80),
    line_thickness: int = 2,
    dot_radius: int = 4,
) -> np.ndarray:
    """Draw pose skeleton connections and dots on a BGR frame."""
    h, w = bgr_frame.shape[:2]
    frame = bgr_frame.copy()

    pts: Dict[int, Tuple[int, int]] = {}
    for idx, name in enumerate(LANDMARK_NAMES):
        kp = keypoints.get(name)
        if kp and kp[3] > 0.3:
            pts[idx] = (int(kp[0] * w), int(kp[1] * h))

    for a, b in POSE_CONNECTIONS:
        if a in pts and b in pts:
            cv2.line(frame, pts[a], pts[b], color, line_thickness, cv2.LINE_AA)

    for pt in pts.values():
        cv2.circle(frame, pt, dot_radius, dot_color, -1, cv2.LINE_AA)

    return frame


def get_body_angle(keypoints: Dict[str, List[float]]) -> float:
    """
    Torso angle from vertical (degrees).
    0° = upright, 90° = horizontal (fallen).
    """
    try:
        ls = keypoints.get("left_shoulder",  [0.5, 0.3, 0, 0])
        rs = keypoints.get("right_shoulder", [0.5, 0.3, 0, 0])
        lh = keypoints.get("left_hip",       [0.5, 0.7, 0, 0])
        rh = keypoints.get("right_hip",      [0.5, 0.7, 0, 0])

        sx = (ls[0] + rs[0]) / 2
        sy = (ls[1] + rs[1]) / 2
        hx = (lh[0] + rh[0]) / 2
        hy = (lh[1] + rh[1]) / 2

        dx = sx - hx
        dy = sy - hy
        return round(math.degrees(math.atan2(abs(dx), abs(dy))), 2)
    except Exception:
        return 0.0


def get_center_of_mass(keypoints: Dict[str, List[float]]) -> Tuple[float, float]:
    """
    Weighted centre-of-mass estimate from major landmarks.
    Returns (x, y) in normalised [0, 1] coordinates.
    """
    weights = {
        "left_shoulder": 0.1, "right_shoulder": 0.1,
        "left_hip":      0.2, "right_hip":      0.2,
        "left_knee":     0.1, "right_knee":     0.1,
        "left_ankle":    0.05, "right_ankle":   0.05,
        "nose":          0.1,
    }
    total_w = cx = cy = 0.0
    for name, w in weights.items():
        kp = keypoints.get(name)
        if kp and kp[3] > 0.3:
            cx += kp[0] * w
            cy += kp[1] * w
            total_w += w

    if total_w == 0:
        return 0.5, 0.5
    return round(cx / total_w, 4), round(cy / total_w, 4)
