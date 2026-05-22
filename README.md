# Guardian Eye — AI-Based Fall Detection System

A production-ready, vision-based fall detection system using MediaPipe pose estimation and rule-based motion analysis. Designed for elderly care environments — no wearable sensors required.

---

## Features

- **Real-Time Detection** — webcam feed processed at 15 FPS; pose skeleton rendered on canvas
- **Video Upload Analysis** — full pipeline (frame extraction → pose estimation → motion analysis → classification)
- **WebSocket Alerts** — fall events broadcast instantly to all connected clients
- **Demo Mode** — synthetic events and live simulation for demonstrations
- **Analytics Dashboard** — charts, heatmaps, confidence distributions, performance metrics
- **Event Management** — filterable/sortable event history with CSV export
- **Dark UI** — deep navy design system with Tailwind CSS + Framer Motion animations

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |

> **Windows users:** MediaPipe works best on Python 3.10. Use a virtual environment.

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
python main.py
```

Backend starts at **http://localhost:8000**
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/system/health

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at **http://localhost:5173**

---

## Project Structure

```
Guardian_Eye/
├── backend/
│   ├── main.py                   # FastAPI app + WebSocket endpoint
│   ├── requirements.txt
│   ├── core/
│   │   ├── config.py             # Application settings
│   │   └── websocket_manager.py  # WS connection manager
│   ├── models/
│   │   └── database.py           # SQLAlchemy ORM models
│   ├── schemas/
│   │   └── schemas.py            # Pydantic request/response schemas
│   ├── services/
│   │   ├── video_processor.py    # Frame extraction utilities
│   │   ├── pose_estimator.py     # MediaPipe Pose wrapper
│   │   ├── motion_analyzer.py    # Velocity / acceleration analysis
│   │   ├── fall_detector.py      # Score-based fall classification engine
│   │   ├── alert_manager.py      # Event persistence + WS broadcasting
│   │   └── demo_data.py          # Synthetic data seeder + stream simulator
│   ├── routers/
│   │   ├── video.py              # Upload / analysis / stream endpoints
│   │   ├── events.py             # Event CRUD + CSV export
│   │   ├── analytics.py          # Charts / metrics data
│   │   ├── settings.py           # Settings CRUD
│   │   └── system.py             # Health + system info
│   └── uploads/                  # Uploaded video files
│
└── frontend/
    ├── src/
    │   ├── pages/                # 6 route-level page components
    │   ├── components/           # Reusable UI components
    │   │   ├── Layout/           # Sidebar, Header, Layout
    │   │   ├── Dashboard/        # Stat cards, alert feed, events table, health
    │   │   ├── Monitor/          # Video panel, confidence meter, metrics, overlay
    │   │   ├── Upload/           # Drop zone, pipeline progress, results, frames
    │   │   ├── Events/           # Table, detail modal
    │   │   └── Analytics/        # Charts (Recharts)
    │   ├── store/                # Zustand global state
    │   ├── services/             # Axios API client + WebSocket service
    │   ├── hooks/                # useWebSocket, useSystemHealth
    │   └── utils/                # Formatters, canvas drawing
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Fall Detection Algorithm

The engine (`services/fall_detector.py`) uses a **sliding window of 30 frames** and a **rule-based scoring system**:

| Condition | Score |
|-----------|-------|
| Body angle > 45° | +30 |
| Body angle > 70° | +20 (additional) |
| Vertical velocity > threshold | +25 |
| Acceleration > threshold | +20 |
| Centre-of-mass Y drop > threshold | +25 |

A fall is **declared** when the score ≥ threshold (default 70%) for **5 consecutive frames**. A **10-second cooldown** suppresses duplicate alerts for the same incident.

---

## WebSocket Protocol

Connect to `ws://localhost:8000/ws/detection`

**Client → Server**
```json
{ "type": "frame", "data": "<base64-jpeg>", "timestamp": 1234567890 }
{ "type": "ping" }
{ "type": "update_settings", "confidence_threshold": 75 }
```

**Server → Client**
```json
{ "type": "pose_update", "frame_id": 142, "keypoints": {...}, "body_angle": 12.4, "com_y": 0.52, "velocity": 0.03, "confidence": 15.2 }
{ "type": "fall_detected", "event_id": 87, "timestamp": "...", "confidence": 91.3, "body_angle": 78.2, "frame_id": 198 }
{ "type": "system_health", "fps": 24.1, "cpu": 38.5, "memory": 61.2, "latency_ms": 42 }
```

---

## Demo Mode

1. Go to **Settings** → enable **Demo Mode** → Save
2. The system seeds 50 synthetic events and starts broadcasting live pose data
3. A simulated fall triggers every ~45 seconds
4. All pages (Dashboard, Analytics, Events) show realistic data immediately

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/video/upload` | Upload a video file |
| POST | `/api/video/analyze/{id}` | Start analysis |
| GET | `/api/video/status/{id}` | Poll analysis progress |
| GET | `/api/video/results/{id}` | Get completed results |
| POST | `/api/video/stream/start` | Start webcam processing |
| POST | `/api/video/stream/stop` | Stop webcam processing |
| GET | `/api/events` | List events (filterable, paginated) |
| GET | `/api/events/{id}` | Get event detail |
| DELETE | `/api/events/{id}` | Delete event |
| GET | `/api/events/export/csv` | Download CSV |
| GET | `/api/analytics/summary` | Overall stats |
| GET | `/api/analytics/falls-over-time` | Time-series data |
| GET | `/api/analytics/confidence-dist` | Confidence histogram |
| GET | `/api/analytics/performance` | System metrics |
| GET | `/api/analytics/heatmap` | Time-of-day heatmap |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/system/info` | Backend info + versions |
| GET | `/api/system/health` | Liveness probe |
| WS | `/ws/detection` | Real-time detection stream |

---

## Technology Stack

**Backend:** Python 3.10 · FastAPI · MediaPipe · OpenCV · NumPy · SQLite / SQLAlchemy · Uvicorn

**Frontend:** React 18 · Vite · Tailwind CSS · Framer Motion · Recharts · Zustand · Axios

---

*Guardian Eye — Final Year Computer Science Project*
