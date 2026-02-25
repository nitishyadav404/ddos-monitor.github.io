"""AbuseIPDB data fetcher.

Fetches the blacklist of recently reported IPs with high confidence scores.
Each IP represents a potential DDoS source. We store the raw response,
then the normalizer converts it to our unified Attack schema.

API docs: https://docs.abuseipdb.com/#blacklist-endpoint
Free tier: 1,000 requests/day  → we fetch every 60s = ~1,440 requests/day.
Solution: fetch every 90s to stay safely under limit (~960 requests/day).
"""
import json
import logging
from datetime import datetime, timezone

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

ABUSEIPDB_BLACKLIST_URL = "https://api.abuseipdb.com/api/v2/blacklist"

# Only fetch IPs with confidence score >= this threshold
MIN_CONFIDENCE = 80
# Max IPs per request (free tier supports up to 10,000)
LIMIT = 500


async def fetch_abuseipdb_blacklist() -> dict | None:
    """
    Fetch high-confidence malicious IPs from AbuseIPDB.
    Returns raw API response dict, or None if API key not set or request fails.
    """
    settings = get_settings()

    if not settings.ABUSEIPDB_API_KEY:
        logger.warning(
            "ABUSEIPDB_API_KEY not set — skipping fetch. "
            "Create an account at abuseipdb.com and add the key to .env"
        )
        return None

    headers = {
        "Key": settings.ABUSEIPDB_API_KEY,
        "Accept": "application/json",
    }
    params = {
        "confidenceMinimum": MIN_CONFIDENCE,
        "limit": LIMIT,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                ABUSEIPDB_BLACKLIST_URL,
                headers=headers,
                params=params,
            )
            response.raise_for_status()
            data = response.json()
            logger.info(
                "AbuseIPDB: fetched %d IPs",
                len(data.get("data", [])),
            )
            return data

    except httpx.HTTPStatusError as e:
        logger.error("AbuseIPDB HTTP error: %s", e)
    except httpx.RequestError as e:
        logger.error("AbuseIPDB request failed: %s", e)

    return None
