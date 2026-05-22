"""
ML classifier interface.

Loads the trained RandomForest from disk and exposes ml_predict().
Call ensure_model_trained() once at startup to guarantee the .pkl exists.
"""
import logging
from pathlib import Path
from typing import Dict

import numpy as np

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "fall_classifier.pkl"

# Module-level cache — loaded once
_clf = None


def _load_model():
    global _clf
    if _clf is not None:
        return _clf
    if not MODEL_PATH.exists():
        return None
    try:
        import joblib
        _clf = joblib.load(MODEL_PATH)
        logger.info("[ML] Classifier loaded from %s", MODEL_PATH)
    except Exception as exc:
        logger.warning("[ML] Could not load classifier: %s", exc)
    return _clf


def _features_to_vector(features: Dict[str, float]) -> np.ndarray:
    """Convert a features dict to the fixed-order numpy row expected by the model."""
    return np.array([[
        features.get("body_angle",       0.0),
        features.get("velocity",         0.0),
        features.get("acceleration",     0.0),
        features.get("com_y_drop",       0.0),
        features.get("angle_change_rate", 0.0),
        features.get("max_velocity",     0.0),
        features.get("max_acceleration", 0.0),
        features.get("com_y",            0.5),
    ]])


def ml_predict(features: Dict[str, float]) -> float:
    """
    Return fall probability scaled to 0–100.
    Returns -1.0 if the model is unavailable (rule-based fallback will be used).
    """
    clf = _load_model()
    if clf is None:
        return -1.0
    try:
        X = _features_to_vector(features)
        prob = clf.predict_proba(X)[0][1]   # P(fall)
        return round(float(prob) * 100.0, 2)
    except Exception as exc:
        logger.debug("[ML] Prediction error: %s", exc)
        return -1.0


def ensure_model_trained() -> None:
    """Train the classifier if no saved model exists. No-op if .pkl is present."""
    if MODEL_PATH.exists():
        _load_model()   # warm up the cache
        return
    logger.info("[ML] No model found — training from scratch…")
    from ml.trainer import train_and_save
    train_and_save()
    _load_model()


def invalidate_cache() -> None:
    """Force reload of the classifier (called after retraining)."""
    global _clf
    _clf = None
    _load_model()
