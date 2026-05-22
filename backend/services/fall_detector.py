"""
Fall detection engine.

Combines a rule-based geometric scorer with a trained RandomForest classifier.
Final confidence = rule_score × 0.4 + ml_score × 0.6 when the ML model is
available; falls back to rule_score alone when it is not.
"""
import logging
import time
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class FallDetector:
    """
    Stateful fall detector that consumes motion features frame-by-frame
    and declares a fall when the confidence score exceeds the threshold
    for at least `min_fall_frames` consecutive frames.
    """

    def __init__(
        self,
        confidence_threshold: float = 70.0,
        min_fall_frames: int = 5,
        cooldown_seconds: float = 10.0,
        velocity_threshold: float = 0.08,
        acceleration_threshold: float = 0.05,
        com_drop_threshold: float = 0.15,
    ):
        self.confidence_threshold = confidence_threshold
        self.min_fall_frames = min_fall_frames
        self.cooldown_seconds = cooldown_seconds
        self.velocity_threshold = velocity_threshold
        self.acceleration_threshold = acceleration_threshold
        self.com_drop_threshold = com_drop_threshold

        self._consecutive_high_score: int = 0
        self._last_fall_time: float = 0.0
        self._current_confidence: float = 0.0

    # ── Public API ────────────────────────────────────────────────────────────

    def classify_motion(self, features: Dict[str, float]) -> Dict:
        """
        Classify a single frame's motion features.

        Returns:
            {
                "is_fall": bool,
                "confidence": float,   # 0–100
                "score_breakdown": {...}
            }
        """
        score, breakdown = self._compute_score(features)
        self._current_confidence = score

        now = time.monotonic()
        in_cooldown = (now - self._last_fall_time) < self.cooldown_seconds

        if score >= self.confidence_threshold and not in_cooldown:
            self._consecutive_high_score += 1
        else:
            self._consecutive_high_score = 0

        is_fall = (
            self._consecutive_high_score >= self.min_fall_frames
            and not in_cooldown
        )

        if is_fall:
            self._last_fall_time = now
            self._consecutive_high_score = 0
            logger.info("FALL DECLARED  confidence=%.1f%%  features=%s", score, features)

        return {
            "is_fall": is_fall,
            "confidence": round(score, 1),
            "consecutive_frames": self._consecutive_high_score,
            "in_cooldown": in_cooldown,
            "score_breakdown": breakdown,
        }

    def update_thresholds(
        self,
        confidence_threshold: Optional[float] = None,
        velocity_threshold: Optional[float] = None,
        acceleration_threshold: Optional[float] = None,
        com_drop_threshold: Optional[float] = None,
    ) -> None:
        """Hot-update detection thresholds without restarting."""
        if confidence_threshold is not None:
            self.confidence_threshold = confidence_threshold
        if velocity_threshold is not None:
            self.velocity_threshold = velocity_threshold
        if acceleration_threshold is not None:
            self.acceleration_threshold = acceleration_threshold
        if com_drop_threshold is not None:
            self.com_drop_threshold = com_drop_threshold

    def reset(self) -> None:
        """Reset internal state (e.g. when switching video source)."""
        self._consecutive_high_score = 0
        self._last_fall_time = 0.0
        self._current_confidence = 0.0

    @property
    def current_confidence(self) -> float:
        return self._current_confidence

    # ── Scoring logic ─────────────────────────────────────────────────────────

    def _compute_score(self, features: Dict[str, float]) -> Tuple[float, Dict]:
        """
        Hybrid scoring: rule-based geometry + RandomForest ML classifier.

        Rule-based:
          body_angle > 45°          → +30
          body_angle > 70°          → +20 (additional)
          vertical_velocity > thr   → +25
          acceleration > thr        → +20
          com_y_drop > thr          → +25  (total clamped to 100)

        Final = rule × 0.4 + ml × 0.6  (or rule alone if ML unavailable)
        """
        # ── Rule-based component ─────────────────────────────────────────────
        rule_score = 0.0
        breakdown: Dict[str, float] = {}

        body_angle   = features.get("body_angle",        0.0)
        velocity     = features.get("velocity",          0.0)
        acceleration = features.get("max_acceleration",  0.0)
        com_drop     = features.get("com_y_drop",        0.0)

        angle_score = 0.0
        if body_angle > 45:
            angle_score += 30
        if body_angle > 70:
            angle_score += 20
        breakdown["angle_score"] = angle_score
        rule_score += angle_score

        vel_score = 0.0
        if velocity > self.velocity_threshold:
            vel_score = 25 * min(1.0, velocity / (self.velocity_threshold * 2))
        breakdown["velocity_score"] = round(vel_score, 1)
        rule_score += vel_score

        accel_score = 0.0
        if acceleration > self.acceleration_threshold:
            accel_score = 20 * min(1.0, acceleration / (self.acceleration_threshold * 2))
        breakdown["acceleration_score"] = round(accel_score, 1)
        rule_score += accel_score

        drop_score = 0.0
        if com_drop > self.com_drop_threshold:
            drop_score = 25 * min(1.0, com_drop / (self.com_drop_threshold * 2))
        breakdown["com_drop_score"] = round(drop_score, 1)
        rule_score += drop_score

        rule_score = min(100.0, rule_score)

        # ── ML component ─────────────────────────────────────────────────────
        try:
            from ml.classifier import ml_predict
            ml_score = ml_predict(features)
        except Exception:
            ml_score = -1.0

        if ml_score >= 0.0:
            final = rule_score * 0.4 + ml_score * 0.6
            breakdown["ml_score"]   = round(ml_score, 1)
            breakdown["rule_score"] = round(rule_score, 1)
        else:
            final = rule_score
            breakdown["ml_score"] = None

        return round(min(100.0, final), 2), breakdown
