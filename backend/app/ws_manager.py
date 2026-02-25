"""WebSocket Connection Manager + Redis pub/sub listener.

Flow:
  AbuseIPDB fetch → normalizer → scheduler.job_ingest_abuseipdb()
    → redis_client.publish_attack()          [publishes to Redis channel]
      → redis_pubsub_listener()              [background task picks it up]
        → ConnectionManager.broadcast()      [pushes to all open WS sockets]
          → frontend useWebSocket hook       [renders arc on globe]

The listener runs as a single asyncio background task started in FastAPI lifespan.
All WebSocket clients share the same listener — efficient, scales to 1000s of clients.
"""
import asyncio
import json
import logging
from typing import Set

from fastapi import WebSocket

from .redis_client import CHANNEL_ATTACKS, get_redis

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Thread-safe manager for active WebSocket connections."""

    def __init__(self) -> None:
        self.active: Set[WebSocket] = set()

    def register(self, ws: WebSocket) -> None:
        self.active.add(ws)
        logger.info("WS client registered. Total connected: %d", len(self.active))

    def unregister(self, ws: WebSocket) -> None:
        self.active.discard(ws)
        logger.info("WS client disconnected. Total connected: %d", len(self.active))

    async def broadcast(self, message: dict) -> None:
        """
        Send message to ALL connected clients.
        Silently removes dead connections (client closed tab, network drop, etc.).
        """
        if not self.active:
            return
        dead: Set[WebSocket] = set()
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active.discard(ws)
        if dead:
            logger.info("WS: removed %d dead connections", len(dead))

    async def send_to(self, ws: WebSocket, message: dict) -> None:
        """Send message to a single client only."""
        try:
            await ws.send_json(message)
        except Exception:
            self.active.discard(ws)


# Singleton manager — imported by main.py
manager = ConnectionManager()


async def redis_pubsub_listener() -> None:
    """
    Long-running background task.
    Subscribes to Redis pub/sub channel and broadcasts every new
    attack event to all connected WebSocket clients.

    Auto-reconnects with exponential backoff on Redis connection loss.
    """
    backoff = 1
    while True:
        try:
            r = get_redis()
            pubsub = r.pubsub()
            await pubsub.subscribe(CHANNEL_ATTACKS)
            logger.info(
                "Redis pub/sub listener started on channel: %s", CHANNEL_ATTACKS
            )
            backoff = 1  # reset on successful connect

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    attack_data = json.loads(message["data"])
                    await manager.broadcast({
                        "type": "attack",
                        "data": attack_data,
                    })
                except json.JSONDecodeError as e:
                    logger.error("WS: invalid JSON from Redis: %s", e)
                except Exception as e:
                    logger.error("WS: broadcast error: %s", e)

        except Exception as e:
            logger.error(
                "Redis pub/sub connection lost: %s. Reconnecting in %ds", e, backoff
            )
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 30)  # exponential backoff, max 30s
