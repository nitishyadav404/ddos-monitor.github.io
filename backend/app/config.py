from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Runtime ──────────────────────────────────────────────
    ENV: str = "dev"
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # ── Security ──────────────────────────────────────────────
    # Used to protect /api/ingest and /api/predict from public access
    INTERNAL_INGEST_KEY: str = "change-me"

    # ── External APIs ─────────────────────────────────────────
    ABUSEIPDB_API_KEY: str | None = None
    CLOUDFLARE_API_KEY: str | None = None

    # ── Storage ───────────────────────────────────────────────
    DATABASE_URL: str | None = None
    REDIS_URL: str | None = None

    # ── Feature flags ─────────────────────────────────────────
    DEMO_MODE: bool = False

    model_config = SettingsConfigDict(
        # Reads from backend/.env at runtime — never committed
        env_file=".env",
        env_file_encoding="utf-8",
        # Silently ignores unknown keys in .env
        extra="ignore",
    )

    def allowed_origins_list(self) -> list[str]:
        """Split comma-separated ALLOWED_ORIGINS into a clean list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Singleton settings instance — cached after first call."""
    return Settings()
