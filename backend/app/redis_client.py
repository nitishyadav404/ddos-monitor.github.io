"""Async Redis client — lazy init, uses REDIS_URL from .env.
Compatible with Upstash Redis (standard Redis protocol over TLS).

Key schema (WRD § Redis Cache Keys):
  counter:today          → int, today's attack count (expires at UTC midnight)
  counter:yesterday      → int, yesterday's final count (TTL: 25h)
  attacks:recent         → Redis list, last 100 AttackEvent JSON strings (TTL: 1h)
  geoip:{ip_hash}        → JSON {country, lat, lng} (TTL: 7 days)
  stats:top_countries    → JSON top-countries payload (TTL: 30s)
  stats:attack_types     → JSON attack-type distribution (TTL: 30s)
  channel:attacks        → Redis pub/sub channel for WebSocket broadcast
"""
import json
import logging
from typing import Optional

import redis.asyncio as aioredis

from .config import get_settings

logger = logging.getLogger(__name__)

# ── Singleton ───────────────────────────────────────────────────────────────────
_redis: Optional[aioredis.Redis] = None

CHANNEL_ATTACKS = "channel:attacks"
KEY_COUNTER_TODAY = "counter:today"
KEY_COUNTER_YESTERDAY = "counter:yesterday"
KEY_RECENT_ATTACKS = "attacks:recent"
MAX_RECENT_ATTACKS = 100


def get_redis() -> aioredis.Redis:
    """Return singleton Redis client. Raises if REDIS_URL not configured."""
    global _redis
    if _redis is None:
        settings = get_settings()
        if not settings.REDIS_URL:
            raise RuntimeError(
                "REDIS_URL is not set in .env — "
                "create an Upstash Redis database and paste the URL."
            )
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return _redis


async def redis_ready() -> bool:
    """Returns True if Redis is reachable. Used by /api/health."""
    try:
        return await get_redis().ping()
    except Exception:
        return False


# ── Counter helpers ──────────────────────────────────────────────────────────────

async def increment_today_counter(amount: int = 1) -> int:
    """Atomically increment the today counter. Returns new value."""
    r = get_redis()
    pipe = r.pipeline()
    pipe.incr(KEY_COUNTER_TODAY, amount)
    # No explicit TTL — the midnight reset job (scheduler) handles this.
    results = await pipe.execute()
    return results[0]


async def get_today_counter() -> int:
    val = await get_redis().get(KEY_COUNTER_TODAY)
    return int(val) if val else 0


async def get_yesterday_counter() -> Optional[int]:
    val = await get_redis().get(KEY_COUNTER_YESTERDAY)
    return int(val) if val else None


async def rotate_day_counter() -> None:
    """
    Called at UTC midnight by the scheduler.
    Saves today’s total as yesterday, resets today counter.
    Gives frontend the previous_day_total to prevent 00:01 UTC confusion.
    """
    r = get_redis()
    today_val = await get_redis().get(KEY_COUNTER_TODAY)
    pipe = r.pipeline()
    if today_val:
        # Keep yesterday's count for 25 hours
        pipe.setex(KEY_COUNTER_YESTERDAY, 90_000, today_val)
    pipe.delete(KEY_COUNTER_TODAY)
    await pipe.execute()
    logger.info("Day counter rotated. Yesterday total: %s", today_val)


# ── Recent attacks list helpers ───────────────────────────────────────────────

async def push_recent_attack(attack_json: str) -> None:
    """Prepend attack to the recent list, trim to MAX_RECENT_ATTACKS."""
    r = get_redis()
    pipe = r.pipeline()
    pipe.lpush(KEY_RECENT_ATTACKS, attack_json)
    pipe.ltrim(KEY_RECENT_ATTACKS, 0, MAX_RECENT_ATTACKS - 1)
    pipe.expire(KEY_RECENT_ATTACKS, 3600)  # 1 hour TTL
    await pipe.execute()


async def get_recent_attacks(limit: int = 100) -> list[dict]:
    """Return the most recent attacks for initial page load (fast)."""
    items = await get_redis().lrange(KEY_RECENT_ATTACKS, 0, limit - 1)
    return [json.loads(i) for i in items]


# ── Pub/sub publish helper ──────────────────────────────────────────────────────

async def publish_attack(attack_dict: dict) -> None:
    """Publish a new attack event to the Redis channel.
    WebSocket manager subscribes to this channel and broadcasts to clients.
    """
    await get_redis().publish(CHANNEL_ATTACKS, json.dumps(attack_dict))
