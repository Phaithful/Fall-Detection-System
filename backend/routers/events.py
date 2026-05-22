"""Event history CRUD endpoints."""
import csv
import io
import logging
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from models.database import Event, get_db
from schemas.schemas import EventRead, EventList

router = APIRouter(prefix="/api/events", tags=["events"])
logger = logging.getLogger(__name__)


@router.get("", response_model=EventList)
def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_fall: Optional[bool] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    min_confidence: Optional[float] = None,
    max_confidence: Optional[float] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all events with filtering, sorting and pagination."""
    query = db.query(Event)

    if is_fall is not None:
        query = query.filter(Event.is_fall == is_fall)
    if status:
        query = query.filter(Event.status == status)
    if source:
        query = query.filter(Event.source == source)
    if min_confidence is not None:
        query = query.filter(Event.confidence >= min_confidence)
    if max_confidence is not None:
        query = query.filter(Event.confidence <= max_confidence)
    if date_from:
        query = query.filter(Event.timestamp >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(Event.timestamp <= datetime.combine(date_to, datetime.max.time()))
    if search:
        query = query.filter(Event.video_filename.contains(search))

    total = query.count()
    items = (
        query.order_by(desc(Event.timestamp))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return EventList(items=items, total=total, page=page, page_size=page_size)


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)):
    """Export all events as a CSV download."""
    events = db.query(Event).order_by(desc(Event.timestamp)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "timestamp", "source", "video_filename",
        "is_fall", "confidence", "body_angle", "velocity",
        "acceleration", "frame_number", "status",
    ])
    for ev in events:
        writer.writerow([
            ev.id, ev.timestamp.isoformat(), ev.source, ev.video_filename or "",
            ev.is_fall, ev.confidence, ev.body_angle, ev.velocity,
            ev.acceleration, ev.frame_number, ev.status,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=guardian_eye_events.csv"},
    )


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """Get a single event by ID."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}/status")
def update_event_status(
    event_id: int,
    status: str = Query(..., regex="^(unreviewed|confirmed|false_alarm)$"),
    db: Session = Depends(get_db),
):
    """Update the review status of an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = status
    db.commit()
    return {"message": "Status updated", "event_id": event_id, "status": status}


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Delete an event record."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"message": "Event deleted", "event_id": event_id}
