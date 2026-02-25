from datetime import date

from sqlalchemy import Date, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class DailyStats(Base):
    """
    Aggregated per-country per-day statistics.
    Updated in real-time as attacks come in (via Redis counter flush).
    Allows fast retrieval of 24h totals without scanning the attacks table.
    Also stores previous_day_total so frontend can show it at 00:01 UTC
    (prevents users thinking the counter is broken at reset time).
    """
    __tablename__ = "daily_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    stat_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    incoming_count: Mapped[int] = mapped_column(Integer, default=0)
    outgoing_count: Mapped[int] = mapped_column(Integer, default=0)

    # Breakdown by attack type (stored as counts)
    syn_flood: Mapped[int] = mapped_column(Integer, default=0)
    udp_flood: Mapped[int] = mapped_column(Integer, default=0)
    http_flood: Mapped[int] = mapped_column(Integer, default=0)
    dns_amplification: Mapped[int] = mapped_column(Integer, default=0)
    ntp_amplification: Mapped[int] = mapped_column(Integer, default=0)
    icmp_flood: Mapped[int] = mapped_column(Integer, default=0)
    volumetric: Mapped[int] = mapped_column(Integer, default=0)
    botnet_driven: Mapped[int] = mapped_column(Integer, default=0)

    # Primary attack type this country faced today (for ranking panel badge)
    primary_attack_type: Mapped[str | None] = mapped_column(String(32))

    __table_args__ = (
        # One row per country per day
        UniqueConstraint("country_code", "stat_date", name="uq_country_date"),
    )

    def __repr__(self) -> str:
        return f"<DailyStats {self.country_code} {self.stat_date} in={self.incoming_count}>"
