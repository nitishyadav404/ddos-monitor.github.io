from fastapi import Header, HTTPException, status
from .config import get_settings


def require_internal_key(
    x_internal_key: str | None = Header(default=None),
) -> None:
    """
    Dependency for internal-only endpoints.
    Caller must send:  X-Internal-Key: <INTERNAL_INGEST_KEY from .env>
    Returns 401 if missing or wrong — stops anyone from injecting
    fake attacks via /api/ingest or calling /api/predict publicly.
    """
    settings = get_settings()
    if not x_internal_key or x_internal_key != settings.INTERNAL_INGEST_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized — internal endpoint",
        )
