"""WebSocket connection manager — handles broadcast and per-client messaging."""
import asyncio
import json
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections with broadcast and unicast support."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections[client_id] = websocket
        logger.info("WebSocket connected: %s  (total=%d)", client_id, len(self.active_connections))

    async def disconnect(self, client_id: str) -> None:
        async with self._lock:
            self.active_connections.pop(client_id, None)
        logger.info("WebSocket disconnected: %s  (total=%d)", client_id, len(self.active_connections))

    async def send_json(self, client_id: str, data: Any) -> None:
        """Send a JSON message to a specific client."""
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception as exc:
                logger.warning("Send failed for %s: %s", client_id, exc)
                await self.disconnect(client_id)

    async def broadcast(self, data: Any) -> None:
        """Broadcast a JSON message to all connected clients."""
        if not self.active_connections:
            return
        payload = json.dumps(data)
        dead: List[str] = []
        async with self._lock:
            clients = list(self.active_connections.items())
        for client_id, ws in clients:
            try:
                await ws.send_text(payload)
            except Exception as exc:
                logger.warning("Broadcast failed for %s: %s", client_id, exc)
                dead.append(client_id)
        for client_id in dead:
            await self.disconnect(client_id)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Singleton shared across the application
manager = ConnectionManager()
