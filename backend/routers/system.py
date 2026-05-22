"""System information and health endpoints."""
import platform
import sys
import logging

import psutil
from fastapi import APIRouter

from schemas.schemas import SystemInfo
from core.websocket_manager import manager as ws_manager

router = APIRouter(prefix="/api/system", tags=["system"])
logger = logging.getLogger(__name__)


def _safe_version(module_name: str) -> str:
    try:
        import importlib
        mod = importlib.import_module(module_name)
        return getattr(mod, "__version__", "unknown")
    except ImportError:
        return "not installed"


@router.get("/info", response_model=SystemInfo)
def get_system_info():
    """Return backend environment and library versions."""
    cv2_version = _safe_version("cv2")
    mp_version = _safe_version("mediapipe")
    mem = psutil.virtual_memory()

    return SystemInfo(
        backend_status="online",
        api_version="1.0.0",
        python_version=sys.version.split()[0],
        opencv_version=cv2_version,
        mediapipe_version=mp_version,
        platform=platform.platform(),
        cpu_count=psutil.cpu_count(logical=True) or 1,
        total_memory_gb=round(mem.total / (1024 ** 3), 2),
    )


@router.get("/health")
def health_check():
    """Quick liveness probe."""
    return {
        "status": "ok",
        "ws_clients": ws_manager.connection_count,
        "cpu_percent": psutil.cpu_percent(interval=None),
        "memory_percent": psutil.virtual_memory().percent,
    }
