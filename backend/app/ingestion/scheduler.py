"""APScheduler — runs ingestion jobs every 90 seconds.

Why 90s and not 60s?
AbuseIPDB free tier = 1,000 requests/day.
60s interval = ~1,440 requests/day  → EXCEEDS free limit.
90s interval = ~960 requests/day    → safely under limit with headroom.
"""
import json
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from .abuseipdb import fetch_abuseipdb_blacklist
from .cloudflare import fetch_ddos_summary
from .normalizer import normalize_abuseipdb_response
from ..geoip import enrich_attack_with_geo
from ..redis_client import (
    increment_today_counter,
    publish_attack,
    push_recent_attack,
    rotate_day_counter,
)

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def job_ingest_abuseipdb() -> None:
    """Fetch → normalise → enrich with GeoIP → Redis cache + pub/sub broadcast."""
    logger.info("[Scheduler] AbuseIPDB ingestion job starting")

    raw = await fetch_abuseipdb_blacklist()
    if not raw:
        return

    attacks = normalize_abuseipdb_response(raw)
    if not attacks:
        logger.info("[Scheduler] No qualifying attacks in AbuseIPDB batch")
        return

    for attack in attacks:
        try:
            # Inject source lat/lng from static country centroids
            attack = enrich_attack_with_geo(attack)

            attack_str = json.dumps(attack, default=str)

            # 1. Push to recent list for fast initial page load
            await push_recent_attack(attack_str)

            # 2. Publish to Redis channel → WebSocket manager broadcasts to clients
            await publish_attack(attack)

            # 3. Increment 24h counter
            await increment_today_counter(1)

        except Exception as e:
            logger.error("[Scheduler] Error processing attack: %s", e)
            continue

    logger.info("[Scheduler] Ingested %d attacks from AbuseIPDB", len(attacks))


async def job_ingest_cloudflare() -> None:
    """Fetch Cloudflare Radar DDoS summary. Full integration in Step 5 (ML)."""
    logger.info("[Scheduler] Cloudflare Radar job starting")
    data = await fetch_ddos_summary()
    if data:
        logger.info(
            "[Scheduler] Cloudflare: received data for layers: %s",
            list(data.keys()),
        )


async def job_midnight_reset() -> None:
    """Rotate day counter at UTC midnight (WRD FR-13)."""
    logger.info("[Scheduler] UTC midnight — rotating day counter")
    await rotate_day_counter()


def start_scheduler() -> None:
    scheduler.add_job(
        job_ingest_abuseipdb,
        trigger=IntervalTrigger(seconds=90),
        id="ingest_abuseipdb",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        job_ingest_cloudflare,
        trigger=IntervalTrigger(seconds=90, jitter=45),
        id="ingest_cloudflare",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        job_midnight_reset,
        trigger=CronTrigger(hour=0, minute=0, second=0, timezone="UTC"),
        id="midnight_reset",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[Scheduler] Started — 3 jobs registered (AbuseIPDB 90s, CF 90s+jitter, midnight reset)")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped")
