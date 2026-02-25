"""Normalization pipeline.

Converts raw AbuseIPDB and Cloudflare responses into
unified AttackEvent objects ready for DB storage + WebSocket broadcast.

WRD § Phase 2: Normalization
- Unified schema, confidence thresholds, repeat IP detection
- IP is hashed BEFORE any storage (GDPR compliance)
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from ..models.attack import Attack
from ..schemas.attack import ATTACK_TYPES, SEVERITY_LEVELS


# ── Confidence → Severity mapping ──────────────────────────────────────────────────
def confidence_to_severity(score: float) -> str:
    """
    Maps AbuseIPDB confidence score (0-100) to severity level.
    ML model will refine this in Step 5; this is the heuristic baseline.
    """
    if score >= 95:
        return "Critical"
    elif score >= 85:
        return "High"
    elif score >= 75:
        return "Medium"
    else:
        return "Low"


# ── AbuseIPDB category → attack type mapping ────────────────────────────────────
# AbuseIPDB category IDs:
# 4=DDoS, 10=Fraud Orders, 14=Port Scan, 18=Brute-Force, 19=Bad Web Bot
# 20=Exploited Host, 21=Web App Attack, 22=SSH, 23=IoT Targeted
ABUSEIPDB_CATEGORY_MAP = {
    4:  "Volumetric",    # DDoS
    14: "SYN Flood",     # Port Scan → often SYN flood
    18: "HTTP Flood",    # Brute-Force → often HTTP-layer
    21: "HTTP Flood",    # Web App Attack
    19: "Botnet-Driven", # Bad Web Bot
    20: "Botnet-Driven", # Exploited Host
}


def map_categories_to_attack_type(categories: list[int]) -> str:
    """Pick the most specific attack type from a list of AbuseIPDB categories."""
    for cat in categories:
        if cat in ABUSEIPDB_CATEGORY_MAP:
            return ABUSEIPDB_CATEGORY_MAP[cat]
    return "Volumetric"  # default fallback


# ── AbuseIPDB normalizer ───────────────────────────────────────────────────────────

def normalize_abuseipdb_entry(
    entry: dict,
    source_country: Optional[str] = None,
    source_lat: Optional[float] = None,
    source_lng: Optional[float] = None,
) -> dict:
    """
    Convert one AbuseIPDB blacklist entry to a unified attack dict.
    GeoIP coordinates are injected by the GeoIP pipeline (Step 4).
    IP is hashed immediately — raw IP is never passed further.

    Input entry shape:
      {
        "ipAddress": "1.2.3.4",
        "abuseConfidenceScore": 92,
        "countryCode": "CN",
        "totalReports": 45,
        "lastReportedAt": "2026-02-25T10:00:00+00:00",
        "categories": [4, 14]
      }
    """
    raw_ip = entry.get("ipAddress", "")
    confidence = float(entry.get("abuseConfidenceScore", 0))
    categories = entry.get("categories") or []
    country = entry.get("countryCode") or source_country

    attack_type = map_categories_to_attack_type(categories)
    severity = confidence_to_severity(confidence)

    return {
        "id": str(uuid.uuid4()),
        "source_ip_hash": Attack.hash_ip(raw_ip),
        "source_country": country,
        "source_lat": source_lat,
        "source_lng": source_lng,
        # Target country will be filled by ML/heuristics in Step 5.
        # For now we use a placeholder derived from traffic patterns.
        "target_country": None,
        "target_lat": None,
        "target_lng": None,
        "attack_type": attack_type,
        "severity": severity,
        "confidence_score": confidence,
        "raw_report_count": int(entry.get("totalReports", 1)),
        "data_source": "abuseipdb",
        "protocol": None,  # enriched in Step 5
        "volume_bps": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def normalize_abuseipdb_response(raw_response: dict) -> list[dict]:
    """Normalise a full AbuseIPDB blacklist API response."""
    entries = raw_response.get("data", [])
    return [
        normalize_abuseipdb_entry(entry)
        for entry in entries
        if entry.get("abuseConfidenceScore", 0) >= 80
    ]
