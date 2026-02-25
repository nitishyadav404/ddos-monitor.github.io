import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class RawAbuseIPDB(Base):
    """
    Unmodified API responses from AbuseIPDB — stored before normalisation.
    WRD: 'Raw API responses stored in PostgreSQL raw data tables (unmodified)'
    Retention: 7 days (purged by scheduler in Step 6).
    """
    __tablename__ = "raw_abuseipdb"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    payload: Mapped[str] = mapped_column(Text, nullable=False)  # raw JSON string
    processed: Mapped[bool] = mapped_column(default=False)


class RawCloudflare(Base):
    """
    Unmodified API responses from Cloudflare Radar.
    Retention: 7 days.
    """
    __tablename__ = "raw_cloudflare"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    endpoint: Mapped[str] = mapped_column(String(100), nullable=False)  # which CF endpoint
    payload: Mapped[str] = mapped_column(Text, nullable=False)  # raw JSON string
    processed: Mapped[bool] = mapped_column(default=False)
