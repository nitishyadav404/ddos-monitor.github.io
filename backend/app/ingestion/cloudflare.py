"""Cloudflare Radar data fetcher.

Fetches DDoS attack summary data from Cloudflare Radar API.
Provides regional traffic anomalies, attack layer breakdowns,
and protocol distribution that enriches our attack classification.

API docs: https://developers.cloudflare.com/radar/
Free tier: no hard rate limit but be respectful — fetch every 90s.
"""
import logging
from datetime import datetime, timedelta, timezone

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

CF_RADAR_BASE = "https://api.cloudflare.com/client/v4/radar"


def _headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


async def fetch_ddos_summary() -> dict | None:
    """
    Fetch DDoS layer 3/4 attack summary for the last 1 hour.
    Returns {'network': ..., 'application': ...} or None.
    """
    settings = get_settings()

    if not settings.CLOUDFLARE_API_KEY:
        logger.warning(
            "CLOUDFLARE_API_KEY not set — skipping fetch. "
            "Create a Cloudflare API token with Radar read permission."
        )
        return None

    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)

    params = {
        "dateStart": one_hour_ago.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dateEnd": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "format": "json",
    }

    results = {}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # L3/L4 DDoS summary
            r1 = await client.get(
                f"{CF_RADAR_BASE}/attacks/layer3/summary",
                headers=_headers(settings.CLOUDFLARE_API_KEY),
                params=params,
            )
            if r1.status_code == 200:
                results["layer3"] = r1.json()
                logger.info("Cloudflare Radar L3 summary fetched")

            # L7 DDoS summary
            r2 = await client.get(
                f"{CF_RADAR_BASE}/attacks/layer7/summary",
                headers=_headers(settings.CLOUDFLARE_API_KEY),
                params=params,
            )
            if r2.status_code == 200:
                results["layer7"] = r2.json()
                logger.info("Cloudflare Radar L7 summary fetched")

    except httpx.RequestError as e:
        logger.error("Cloudflare Radar request failed: %s", e)
        return None

    return results if results else None
