"""Motion analysis — velocity, acceleration, and feature extraction from pose history."""
import logging
from collections import deque
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class PoseFrame:
    """Lightweight container for a single frame's pose measurements."""

    __slots__ = ("timestamp_ms", "body_angle", "com_x", "com_y", "keypoints")

    def __init__(
        self,
        timestamp_ms: float,
        body_angle: float,
        com_x: float,
        com_y: float,
        keypoints: Dict[str, List[float]],
    ):
        self.timestamp_ms = timestamp_ms
        self.body_angle = body_angle
        self.com_x = com_x
        self.com_y = com_y
        self.keypoints = keypoints


class MotionAnalyzer:
    """
    Maintains a sliding window of recent pose frames and computes
    real-time motion features used by the fall detector.
    """

    def __init__(self, window_size: int = 30):
        self.window_size = window_size
        self._history: Deque[PoseFrame] = deque(maxlen=window_size)

    # ── Public API ────────────────────────────────────────────────────────────

    def push(self, frame: PoseFrame) -> None:
        """Append a new pose frame to the sliding window."""
        self._history.append(frame)

    def reset(self) -> None:
        """Clear history (e.g. on source change)."""
        self._history.clear()

    def get_features(self) -> Dict[str, float]:
        """
        Compute motion features from the current sliding window.
        Returns a dict with all values needed by the fall detector.
        """
        if len(self._history) < 2:
            return self._zero_features()

        frames = list(self._history)

        angles = [f.body_angle for f in frames]
        com_ys = [f.com_y for f in frames]
        timestamps = [f.timestamp_ms for f in frames]

        velocities = _calc_velocities(com_ys, timestamps)
        accelerations = _calc_accelerations(velocities, timestamps)
        angle_changes = _calc_angle_changes(angles)

        # Current frame values
        current_angle = angles[-1]
        current_com_y = com_ys[-1]
        current_velocity = velocities[-1] if velocities else 0.0
        current_accel = accelerations[-1] if accelerations else 0.0
        current_angle_change = angle_changes[-1] if angle_changes else 0.0

        # Max drops in the window
        max_velocity = max(velocities, default=0.0)
        max_acceleration = max(abs(a) for a in accelerations) if accelerations else 0.0
        com_y_range = max(com_ys) - min(com_ys)

        return {
            "body_angle": round(current_angle, 2),
            "com_y": round(current_com_y, 4),
            "velocity": round(current_velocity, 4),
            "acceleration": round(current_accel, 4),
            "angle_change_rate": round(current_angle_change, 2),
            "max_velocity": round(max_velocity, 4),
            "max_acceleration": round(max_acceleration, 4),
            "com_y_drop": round(com_y_range, 4),
        }

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def history_length(self) -> int:
        return len(self._history)

    @property
    def latest_angle(self) -> float:
        if not self._history:
            return 0.0
        return self._history[-1].body_angle

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _zero_features() -> Dict[str, float]:
        return {
            "body_angle": 0.0,
            "com_y": 0.5,
            "velocity": 0.0,
            "acceleration": 0.0,
            "angle_change_rate": 0.0,
            "max_velocity": 0.0,
            "max_acceleration": 0.0,
            "com_y_drop": 0.0,
        }


# ── Module-level pure functions (also usable in batch analysis) ───────────────

def _calc_velocities(values: List[float], timestamps_ms: List[float]) -> List[float]:
    """Compute finite-difference velocity list (same length as values, with leading 0)."""
    if len(values) < 2:
        return [0.0]
    vels = [0.0]
    for i in range(1, len(values)):
        dt = (timestamps_ms[i] - timestamps_ms[i - 1]) / 1000.0   # ms → s
        if dt <= 0:
            dt = 1 / 30.0   # assume 30fps if timestamps are identical
        vels.append((values[i] - values[i - 1]) / dt)
    return vels


def _calc_accelerations(velocities: List[float], timestamps_ms: List[float]) -> List[float]:
    """Compute acceleration from velocity list."""
    if len(velocities) < 2:
        return [0.0]
    accels = [0.0]
    for i in range(1, len(velocities)):
        dt = (timestamps_ms[i] - timestamps_ms[i - 1]) / 1000.0
        if dt <= 0:
            dt = 1 / 30.0
        accels.append((velocities[i] - velocities[i - 1]) / dt)
    return accels


def _calc_angle_changes(angles: List[float]) -> List[float]:
    """Frame-to-frame angle change (degrees/frame)."""
    if len(angles) < 2:
        return [0.0]
    changes = [0.0]
    for i in range(1, len(angles)):
        changes.append(angles[i] - angles[i - 1])
    return changes


def calculate_velocity(positions: List[float], timestamps_ms: List[float]) -> List[float]:
    """Public helper for batch callers."""
    return _calc_velocities(positions, timestamps_ms)


def calculate_acceleration(velocities: List[float], timestamps_ms: List[float]) -> List[float]:
    """Public helper for batch callers."""
    return _calc_accelerations(velocities, timestamps_ms)


def calculate_body_orientation_change(angles: List[float]) -> List[float]:
    """Public helper for batch callers."""
    return _calc_angle_changes(angles)
