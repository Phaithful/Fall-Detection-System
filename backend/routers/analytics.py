"""Analytics and reporting endpoints."""
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.database import Event, PerformanceLog, get_db
from schemas.schemas import (
    AnalyticsSummary,
    ConfidenceDistPoint,
    FallsOverTimePoint,
    HeatmapPoint,
    PerformanceMetrics,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(db: Session = Depends(get_db)):
    """Overall detection statistics."""
    total = db.query(Event).count()
    falls = db.query(Event).filter(Event.is_fall == True).count()
    non_falls = total - falls

    false_alarms = db.query(Event).filter(
        Event.is_fall == True, Event.status == "false_alarm"
    ).count()
    false_alarm_rate = (false_alarms / falls * 100) if falls > 0 else 0.0

    avg_conf_row = db.query(func.avg(Event.confidence)).scalar()
    avg_conf = float(avg_conf_row or 0.0)

    today = datetime.utcnow().date()
    today_events = db.query(Event).filter(
        func.date(Event.timestamp) == today
    ).count()
    today_falls = db.query(Event).filter(
        func.date(Event.timestamp) == today,
        Event.is_fall == True,
    ).count()

    first_event = db.query(func.min(Event.timestamp)).scalar()
    uptime_hours = 0.0
    if first_event:
        delta = datetime.utcnow() - first_event
        uptime_hours = round(delta.total_seconds() / 3600, 1)

    return AnalyticsSummary(
        total_events=total,
        total_falls=falls,
        total_non_falls=non_falls,
        false_alarm_rate=round(false_alarm_rate, 1),
        avg_confidence=round(avg_conf, 1),
        uptime_hours=uptime_hours,
        today_events=today_events,
        today_falls=today_falls,
    )


@router.get("/falls-over-time", response_model=List[FallsOverTimePoint])
def falls_over_time(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """Aggregated fall counts over time (daily/weekly/monthly)."""
    since = datetime.utcnow() - timedelta(days=days)
    events = db.query(Event).filter(Event.timestamp >= since).all()

    buckets: dict = defaultdict(lambda: {"falls": 0, "non_falls": 0})

    for ev in events:
        if period == "daily":
            key = ev.timestamp.strftime("%Y-%m-%d")
        elif period == "weekly":
            iso = ev.timestamp.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
        else:
            key = ev.timestamp.strftime("%Y-%m")

        if ev.is_fall:
            buckets[key]["falls"] += 1
        else:
            buckets[key]["non_falls"] += 1

    result = []
    for period_key in sorted(buckets.keys()):
        b = buckets[period_key]
        result.append(FallsOverTimePoint(
            period=period_key,
            falls=b["falls"],
            non_falls=b["non_falls"],
            total=b["falls"] + b["non_falls"],
        ))
    return result


@router.get("/confidence-dist", response_model=List[ConfidenceDistPoint])
def confidence_distribution(db: Session = Depends(get_db)):
    """Histogram of confidence scores across all events (10 buckets)."""
    events = db.query(Event.confidence).all()
    buckets = defaultdict(int)
    labels = [f"{i*10}-{i*10+10}" for i in range(10)]
    for label in labels:
        buckets[label] = 0

    for (conf,) in events:
        idx = min(int(conf // 10), 9)
        buckets[labels[idx]] += 1

    return [
        ConfidenceDistPoint(bucket=label, count=buckets[label])
        for label in labels
    ]


@router.get("/performance", response_model=PerformanceMetrics)
def get_performance(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    """Average system performance metrics for the last N hours."""
    since = datetime.utcnow() - timedelta(hours=hours)
    logs = db.query(PerformanceLog).filter(PerformanceLog.timestamp >= since).all()

    if not logs:
        return PerformanceMetrics(
            avg_fps=0, avg_cpu=0, avg_memory=0, avg_latency_ms=0, samples=0
        )

    n = len(logs)
    return PerformanceMetrics(
        avg_fps=round(sum(l.fps for l in logs) / n, 1),
        avg_cpu=round(sum(l.cpu_usage for l in logs) / n, 1),
        avg_memory=round(sum(l.memory_usage for l in logs) / n, 1),
        avg_latency_ms=round(sum(l.detection_latency_ms for l in logs) / n, 1),
        samples=n,
    )


@router.get("/heatmap", response_model=List[HeatmapPoint])
def get_heatmap(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
):
    """Fall frequency by hour-of-day × day-of-week for heatmap visualisation."""
    since = datetime.utcnow() - timedelta(days=days)
    events = (
        db.query(Event)
        .filter(Event.timestamp >= since, Event.is_fall == True)
        .all()
    )

    counts: dict = defaultdict(int)
    for ev in events:
        key = (ev.timestamp.hour, ev.timestamp.weekday())
        counts[key] += 1

    result = []
    for hour in range(24):
        for day in range(7):
            result.append(HeatmapPoint(hour=hour, day=day, count=counts.get((hour, day), 0)))
    return result


@router.get("/performance-series")
def performance_series(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    """Raw performance log series for trend charts."""
    since = datetime.utcnow() - timedelta(hours=hours)
    logs = (
        db.query(PerformanceLog)
        .filter(PerformanceLog.timestamp >= since)
        .order_by(PerformanceLog.timestamp)
        .limit(500)
        .all()
    )
    return [
        {
            "timestamp": l.timestamp.isoformat(),
            "fps": l.fps,
            "cpu": l.cpu_usage,
            "memory": l.memory_usage,
            "latency_ms": l.detection_latency_ms,
        }
        for l in logs
    ]
