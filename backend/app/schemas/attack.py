from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Attack type literals (matches WRD FR-10) ───────────────────────────────────
ATTACK_TYPES = [
    "SYN Flood",
    "UDP Flood",
    "HTTP Flood",
    "DNS Amplification",
    "NTP Amplification",
    "ICMP Flood",
    "Volumetric",
    "Botnet-Driven",
]

SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low"]


class AttackEvent(BaseModel):
    """
    A single attack event — broadcast via WebSocket and stored in DB.
    This is the shape the frontend receives on every live event.
    """
    id: str
    source_country: Optional[str] = None      # ISO-3166 alpha-2, e.g. "CN"
    source_lat: Optional[float] = None
    source_lng: Optional[float] = None
    target_country: Optional[str] = None
    target_lat: Optional[float] = None
    target_lng: Optional[float] = None
    attack_type: str = "Volumetric"            # from ATTACK_TYPES list
    severity: str = "Low"                      # from SEVERITY_LEVELS list
    confidence_score: float = Field(default=0.0, ge=0, le=100)
    volume_bps: Optional[int] = None           # estimated bandwidth
    protocol: Optional[str] = None
    timestamp: datetime
    data_source: str = "abuseipdb"

    model_config = {"from_attributes": True}


class AttackTodayResponse(BaseModel):
    """
    Response for GET /api/attacks/today
    Includes previous_day_total to prevent 00:01 UTC confusion.
    """
    utc_day: str
    total: int
    by_type: dict[str, int]
    previous_day_total: Optional[int] = None  # yesterday's final count
    percent_change: Optional[float] = None    # vs yesterday
    data_freshness: str = "live"


class HistoryPoint(BaseModel):
    """One 5-minute bucket in the 24h time-series chart."""
    timestamp_utc: datetime
    count: int


class HistoryResponse(BaseModel):
    """Response for GET /api/attacks/history"""
    points: list[HistoryPoint]
    bucket_minutes: int = 5
