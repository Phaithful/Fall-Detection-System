"""
Fall classifier trainer.

Generates synthetic biomechanics-derived training data and trains a
RandomForestClassifier on 8 pose-motion features extracted by motion_analyzer.

Feature vector order (must stay in sync with classifier.py):
    [body_angle, velocity, acceleration, com_y_drop,
     angle_change_rate, max_velocity, max_acceleration, com_y]
"""
import logging
import os
from pathlib import Path
from typing import Tuple

import numpy as np

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "fall_classifier.pkl"
FEATURE_NAMES = [
    "body_angle", "velocity", "acceleration", "com_y_drop",
    "angle_change_rate", "max_velocity", "max_acceleration", "com_y",
]


def _rng_samples(
    rng: np.random.Generator,
    n: int,
    angle_range: Tuple[float, float],
    vel_range: Tuple[float, float],
    accel_range: Tuple[float, float],
    drop_range: Tuple[float, float],
    angle_rate_range: Tuple[float, float],
    noise_pct: float = 0.20,
) -> np.ndarray:
    """Draw n samples from uniform ranges and add Gaussian noise."""
    def col(lo, hi):
        raw = rng.uniform(lo, hi, n)
        noise = rng.normal(0.0, (hi - lo) * noise_pct, n)
        return np.clip(raw + noise, 0.0, None)

    angle        = col(*angle_range)
    velocity     = col(*vel_range)
    acceleration = col(*accel_range)
    com_y_drop   = col(*drop_range)
    angle_rate   = col(*angle_rate_range)
    max_vel      = velocity  + rng.uniform(0, 0.05, n)
    max_accel    = acceleration + rng.uniform(0, 0.02, n)
    com_y        = rng.uniform(0.3, 0.9, n)   # vertical position — not strongly discriminative

    return np.column_stack([
        angle, velocity, acceleration, com_y_drop,
        angle_rate, max_vel, max_accel, com_y,
    ])


def generate_training_data(seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """Return (X, y) arrays of synthetic training samples."""
    rng = np.random.default_rng(seed)

    # ── Falls (label = 1) ────────────────────────────────────────────────────
    # Classic forward/sideways fall: body nearly horizontal, fast CoM drop
    falls_classic = _rng_samples(rng, 1200,
        angle_range=(55, 89), vel_range=(0.12, 0.40),
        accel_range=(0.10, 0.30), drop_range=(0.18, 0.45),
        angle_rate_range=(18, 40))

    # Slow/assisted falls: body at intermediate angle, moderate motion
    falls_slow = _rng_samples(rng, 500,
        angle_range=(45, 65), vel_range=(0.08, 0.18),
        accel_range=(0.06, 0.14), drop_range=(0.12, 0.28),
        angle_rate_range=(10, 25))

    # Sudden collapse: extreme acceleration, angle may not be very high yet
    falls_collapse = _rng_samples(rng, 300,
        angle_range=(35, 75), vel_range=(0.20, 0.50),
        accel_range=(0.20, 0.45), drop_range=(0.20, 0.50),
        angle_rate_range=(20, 50), noise_pct=0.15)

    # ── No-falls (label = 0) ─────────────────────────────────────────────────
    # Standing still / minor sway
    nf_standing = _rng_samples(rng, 1500,
        angle_range=(0, 18), vel_range=(0.0, 0.03),
        accel_range=(0.0, 0.02), drop_range=(0.0, 0.04),
        angle_rate_range=(0, 4))

    # Normal walking
    nf_walking = _rng_samples(rng, 800,
        angle_range=(5, 20), vel_range=(0.02, 0.07),
        accel_range=(0.01, 0.04), drop_range=(0.01, 0.07),
        angle_rate_range=(1, 8))

    # Sitting down / getting up
    nf_sitting = _rng_samples(rng, 400,
        angle_range=(10, 35), vel_range=(0.02, 0.08),
        accel_range=(0.01, 0.04), drop_range=(0.05, 0.14),
        angle_rate_range=(2, 10))

    # Bending / picking something up
    nf_bending = _rng_samples(rng, 400,
        angle_range=(25, 55), vel_range=(0.01, 0.05),
        accel_range=(0.01, 0.03), drop_range=(0.03, 0.12),
        angle_rate_range=(1, 8))

    # Ambiguous — mid-range angle with moderate motion (label = 0 to avoid FP)
    nf_ambiguous = _rng_samples(rng, 400,
        angle_range=(40, 58), vel_range=(0.04, 0.11),
        accel_range=(0.02, 0.07), drop_range=(0.08, 0.18),
        angle_rate_range=(4, 14))

    X_fall   = np.vstack([falls_classic, falls_slow, falls_collapse])
    X_nofall = np.vstack([nf_standing, nf_walking, nf_sitting, nf_bending, nf_ambiguous])

    X = np.vstack([X_fall, X_nofall])
    y = np.hstack([
        np.ones(len(X_fall),   dtype=int),
        np.zeros(len(X_nofall), dtype=int),
    ])

    # Shuffle
    idx = rng.permutation(len(X))
    return X[idx], y[idx]


def train_and_save(extra_X: np.ndarray = None, extra_y: np.ndarray = None) -> dict:
    """
    Train the RandomForest, optionally augmented with real event samples,
    save to MODEL_PATH and return performance metrics.
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    import joblib

    X, y = generate_training_data()

    if extra_X is not None and len(extra_X) > 0:
        X = np.vstack([X, extra_X])
        y = np.hstack([y, extra_y])
        logger.info("[ML] Augmented with %d real event samples", len(extra_X))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    logger.info("[ML] Training RandomForest on %d samples…", len(X_train))

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    metrics = {
        "samples":   int(len(X)),
        "accuracy":  round(float(accuracy_score(y_test, y_pred)),  4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall":    round(float(recall_score(y_test, y_pred,    zero_division=0)), 4),
        "f1":        round(float(f1_score(y_test, y_pred,        zero_division=0)), 4),
    }
    logger.info(
        "[ML] Training complete — accuracy=%.3f  precision=%.3f  recall=%.3f  f1=%.3f",
        metrics["accuracy"], metrics["precision"], metrics["recall"], metrics["f1"],
    )

    joblib.dump(clf, MODEL_PATH)
    logger.info("[ML] Model saved → %s", MODEL_PATH)
    return metrics
