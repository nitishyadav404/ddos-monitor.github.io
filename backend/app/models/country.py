from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Country(Base):
    """
    Reference table: ISO-3166 country codes → names + centroid coordinates.
    Pre-populated at startup from a static JSON file.
    Used by GeoIP pipeline (Step 4) for lat/lng lookup without extra API calls.
    """
    __tablename__ = "countries"

    code: Mapped[str] = mapped_column(String(2), primary_key=True)  # e.g. "IN"
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "India"
    lat: Mapped[float] = mapped_column(Float, nullable=False)       # centroid latitude
    lng: Mapped[float] = mapped_column(Float, nullable=False)       # centroid longitude
    region: Mapped[str | None] = mapped_column(String(50))          # e.g. "South Asia"

    def __repr__(self) -> str:
        return f"<Country {self.code} — {self.name}>"
