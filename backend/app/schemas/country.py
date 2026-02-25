from typing import Optional

from pydantic import BaseModel


class CountryEntry(BaseModel):
    """One row in the top-countries ranking panel."""
    rank: int
    country_code: str
    country_name: str
    count: int
    primary_attack_type: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class TopCountriesResponse(BaseModel):
    """Response for GET /api/stats/top-countries"""
    top_target: list[CountryEntry]   # most attacked
    top_source: list[CountryEntry]   # most attacking


class MiniHistoryPoint(BaseModel):
    timestamp_utc: str
    count: int


class TopAttackType(BaseModel):
    attack_type: str
    count: int
    percentage: float


class TopSource(BaseModel):
    country_code: str
    country_name: str
    count: int


class CountryDetailResponse(BaseModel):
    """
    Response for GET /api/country/{code}
    Displayed in the country detail modal (FR-17).
    """
    country_code: str
    country_name: Optional[str] = None
    incoming_today: int = 0
    outgoing_today: int = 0
    top_attack_types: list[TopAttackType] = []
    top_sources: list[TopSource] = []       # countries attacking this nation
    top_targets: list[TopSource] = []       # countries this nation attacks
    severity_level: str = "Low"
    history_24h: list[MiniHistoryPoint] = []
