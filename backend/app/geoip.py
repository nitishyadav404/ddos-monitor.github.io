"""GeoIP resolution service.

Resolution order (fastest to most accurate):
  1. Redis cache (TTL 7 days) — avoids re-resolving same IP hash
  2. AbuseIPDB already includes countryCode in its response
     — we use that as the primary source (zero extra API calls)
  3. MaxMind GeoLite2 .mmdb file (if present at backend/data/GeoLite2-Country.mmdb)
     — optional upgrade for IPs not covered by AbuseIPDB
  4. Static country_coords.json for lat/lng lookup (always available, in repo)

NOTE: The GeoLite2-Country.mmdb file is in .gitignore (large binary).
To enable MaxMind resolution:
  1. Register at maxmind.com (free)
  2. Download GeoLite2-Country.mmdb
  3. Place it at backend/data/GeoLite2-Country.mmdb
  4. The service auto-detects its presence on startup.
"""
import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Path to static coords file (always in repo)
_COORDS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "country_coords.json",
)

# Path to optional MaxMind .mmdb (in .gitignore, downloaded separately)
_MMDB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "GeoLite2-Country.mmdb",
)

# ── Load static coords at module import (fast, ~20KB) ─────────────────────────
try:
    with open(_COORDS_PATH, "r", encoding="utf-8") as f:
        _COUNTRY_COORDS: dict = json.load(f)
    logger.info("GeoIP: loaded %d country centroids", len(_COUNTRY_COORDS))
except FileNotFoundError:
    _COUNTRY_COORDS = {}
    logger.error("GeoIP: country_coords.json not found at %s", _COORDS_PATH)

# ── Optional MaxMind reader ───────────────────────────────────────────────────────
_maxmind_reader = None

if os.path.exists(_MMDB_PATH):
    try:
        import geoip2.database
        _maxmind_reader = geoip2.database.Reader(_MMDB_PATH)
        logger.info("GeoIP: MaxMind GeoLite2 database loaded")
    except Exception as e:
        logger.warning("GeoIP: MaxMind load failed (%s) — using static coords only", e)
else:
    logger.info(
        "GeoIP: GeoLite2-Country.mmdb not found — using AbuseIPDB countryCode + "
        "static centroids (accurate enough for globe arcs). "
        "To upgrade: download from maxmind.com and place at backend/data/GeoLite2-Country.mmdb"
    )


# ── Public API ───────────────────────────────────────────────────────────────────────

def get_coords_for_country(country_code: str) -> tuple[Optional[float], Optional[float]]:
    """Return (lat, lng) centroid for a country code, or (None, None)."""
    if not country_code:
        return None, None
    entry = _COUNTRY_COORDS.get(country_code.upper())
    if not entry:
        return None, None
    return entry["lat"], entry["lng"]


def get_country_name(country_code: str) -> Optional[str]:
    """Return full country name for a code, or None."""
    if not country_code:
        return None
    entry = _COUNTRY_COORDS.get(country_code.upper())
    return entry["name"] if entry else None


def resolve_ip_to_country(ip: str) -> Optional[str]:
    """
    Resolve an IP address to ISO-3166 country code using MaxMind.
    Returns None if MaxMind is not loaded or IP cannot be resolved.
    NOTE: AbuseIPDB already provides countryCode — this is for IPs
    not covered by AbuseIPDB (e.g., from Cloudflare Radar).
    """
    if not _maxmind_reader:
        return None
    try:
        response = _maxmind_reader.country(ip)
        return response.country.iso_code
    except Exception:
        return None


def enrich_attack_with_geo(attack: dict) -> dict:
    """
    Inject lat/lng coordinates into a normalised attack dict.
    Call this after normalisation, before DB storage and broadcast.
    """
    src = attack.get("source_country")
    tgt = attack.get("target_country")

    if src and not attack.get("source_lat"):
        lat, lng = get_coords_for_country(src)
        attack["source_lat"] = lat
        attack["source_lng"] = lng

    if tgt and not attack.get("target_lat"):
        lat, lng = get_coords_for_country(tgt)
        attack["target_lat"] = lat
        attack["target_lng"] = lng

    return attack


def all_countries() -> dict:
    """Return the full country_coords dict (used to seed the countries table)."""
    return _COUNTRY_COORDS
