import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Attack(Base):
    """
    Normalised attack record — the core table.

    PRIVACY NOTES (WRD § Security and Privacy):
    - source_ip is stored as a SHA-256 hash ONLY. Raw IPs never persist.
    - Only country-level data is exposed in API responses.
    - Records older than 90 days should be purged (scheduled job, Step 6).
    """
    __tablename__ = "attacks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # ── Source (privacy-safe) ──────────────────────────────────────────────────
    source_ip_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_country: Mapped[str | None] = mapped_column(String(2))   # ISO-3166 alpha-2
    source_lat: Mapped[float | None] = mapped_column(Float)
    source_lng: Mapped[float | None] = mapped_column(Float)

    # ── Target ────────────────────────────────────────────────────────────────
    target_country: Mapped[str | None] = mapped_column(String(2), index=True)
    target_lat: Mapped[float | None] = mapped_column(Float)
    target_lng: Mapped[float | None] = mapped_column(Float)

    # ── Classification (from ML model) ────────────────────────────────────────
    attack_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="Volumetric"
    )
    # One of: SYN Flood | UDP Flood | HTTP Flood | DNS Amplification |
    #         NTP Amplification | ICMP Flood | Volumetric | Botnet-Driven

    severity: Mapped[str] = mapped_column(
        String(8), nullable=False, default="Low"
    )
    # One of: Critical | High | Medium | Low

    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    # AbuseIPDB confidence that the IP is malicious (0-100)

    # ── Metadata ──────────────────────────────────────────────────────────────
    volume_bps: Mapped[int | None] = mapped_column(Integer)
    protocol: Mapped[str | None] = mapped_column(String(16))  # SYN, UDP, HTTP, etc.
    data_source: Mapped[str] = mapped_column(String(16), default="abuseipdb")
    # One of: abuseipdb | cloudflare

    raw_report_count: Mapped[int] = mapped_column(Integer, default=1)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    __table_args__ = (
        # Composite index for most common query pattern: today's attacks per country
        Index("ix_attacks_target_ts", "target_country", "timestamp"),
        Index("ix_attacks_source_ts", "source_country", "timestamp"),
        Index("ix_attacks_type_ts", "attack_type", "timestamp"),
    )

    @staticmethod
    def hash_ip(ip: str) -> str:
        """One-way hash an IP address before storage. GDPR compliant."""
        return hashlib.sha256(ip.encode()).hexdigest()

    def __repr__(self) -> str:
        return (
            f"<Attack id={self.id} "
            f"{self.source_country}→{self.target_country} "
            f"{self.attack_type} [{self.severity}]>"
        )
