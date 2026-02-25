"""APScheduler setup — runs ingestion jobs every 90 seconds.

Why 90s and not 60s?
AbuseIPDB free tier = 1,000 requests/day.
60s interval = ~1,440 requests/day  → EXCEEDS free limit.
90s interval = ~960 requests/day    → safely under limit with headroom.

The scheduler is started in FastAPI lifespan and shuts down cleanly.
"""
import json
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from .abuseipdb import fetch_abuseipdb_blacklist
from .cloudflare import fetch_ddos_summary
from .normalizer import normalize_abuseipdb_response
from ..redis_client import (
    push_recent_attack,
    publish_attack,
    increment_today_counter,
    rotate_day_counter,
)

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def job_ingest_abuseipdb() -> None:
    """Fetch AbuseIPDB blacklist, normalise, cache in Redis, broadcast via pub/sub."""
    logger.info("[Scheduler] Running AbuseIPDB ingestion job")

    raw = await fetch_abuseipdb_blacklist()
    if not raw:
        return

    attacks = normalize_abuseipdb_response(raw)
    if not attacks:
        logger.info("[Scheduler] No qualifying attacks in this AbuseIPDB batch")
        return

    for attack in attacks:
        try:
            attack_str = json.dumps(attack)
            # Push to recent list (fast page-load)
            await push_recent_attack(attack_str)
            # Publish to Redis channel (WebSocket manager picks this up)
            await publish_attack(attack)
            # Increment today's counter
            await increment_today_counter(1)
        except Exception as e:
            logger.error("[Scheduler] Failed to process attack: %s", e)

    logger.info("[Scheduler] Ingested %d attacks from AbuseIPDB", len(attacks))


async def job_ingest_cloudflare() -> None:
    """Fetch Cloudflare Radar DDoS summary and log it.
    Full integration with normalizer happens in Step 5 (after ML features).
    """
    logger.info("[Scheduler] Running Cloudflare Radar ingestion job")
    data = await fetch_ddos_summary()
    if data:
        logger.info(
            "[Scheduler] Cloudflare data received: layers=%s",
            list(data.keys()),
        )


async def job_midnight_reset() -> None:
    """Rotate day counter at UTC midnight (WRD FR-13)."""
    logger.info("[Scheduler] UTC midnight — rotating day counter")
    await rotate_day_counter()


def start_scheduler() -> None:
    """Register all jobs and start the scheduler."""
    # AbuseIPDB ingestion every 90 seconds
    scheduler.add_job(
        job_ingest_abuseipdb,
        trigger=IntervalTrigger(seconds=90),
        id="ingest_abuseipdb",
        replace_existing=True,
        max_instances=1,
    )

    # Cloudflare ingestion every 90 seconds (offset by 45s to spread load)
    scheduler.add_job(
        job_ingest_cloudflare,
        trigger=IntervalTrigger(seconds=90, start_date=None),
        id="ingest_cloudflare",
        replace_existing=True,
        max_instances=1,
    )

    # Day counter rotation at exactly 00:00:00 UTC every day
    scheduler.add_job(
        job_midnight_reset,
        trigger=CronTrigger(hour=0, minute=0, second=0, timezone="UTC"),
        id="midnight_reset",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("[Scheduler] Started — 3 jobs registered")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped")
