from pydantic import BaseModel


class AttackTypeDistribution(BaseModel):
    """One slice of the donut chart (FR-14)."""
    attack_type: str
    count: int
    percentage: float


class ProtocolEntry(BaseModel):
    protocol: str
    count: int
    percentage: float


class StatsResponse(BaseModel):
    """Response for GET /api/stats/attack-types"""
    distribution: list[AttackTypeDistribution]
    protocols: list[ProtocolEntry] = []
