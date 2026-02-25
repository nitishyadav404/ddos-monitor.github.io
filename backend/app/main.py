import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .security import require_internal_key

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Startup / Shutdown lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    logger.info("Starting DDoS Monitor API | env=%s demo=%s", settings.ENV, settings.DEMO_MODE)

    # 1. Create DB tables (idempotent — safe to run every restart)
    if settings.DATABASE_URL:
        try:
            from .database import Base, get_engine
            import app.models  # noqa — registers all ORM models with metadata
            async with get_engine().begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("DB: tables verified/created")
        except Exception as e:
            logger.error("DB startup error (continuing without DB): %s", e)
    else:
        logger.warning("DATABASE_URL not set — skipping DB init")

    # 2. Start Redis pub/sub listener (broadcasts attacks to WebSocket clients)
    pubsub_task = None
    if settings.REDIS_URL:
        from .ws_manager import redis_pubsub_listener
        pubsub_task = asyncio.create_task(redis_pubsub_listener())
        logger.info("Redis pub/sub listener task started")
    else:
        logger.warning("REDIS_URL not set — WebSocket broadcast disabled")

    # 3. Start ingestion scheduler (cron jobs every 90s)
    if settings.REDIS_URL:
        try:
            from .ingestion.scheduler import start_scheduler
            start_scheduler()
        except Exception as e:
            logger.error("Scheduler startup error (continuing): %s", e)
    else:
        logger.warning("REDIS_URL not set — scheduler not started")

    yield

    # ── SHUTDOWN ──
    logger.info("Shutting down DDoS Monitor API")
    if pubsub_task:
        pubsub_task.cancel()
        try:
            await pubsub_task
        except asyncio.CancelledError:
            pass
    try:
        from .ingestion.scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass
    if settings.DATABASE_URL:
        try:
            from .database import get_engine
            await get_engine().dispose()
        except Exception:
            pass


# ── App ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DDoS Monitor API",
    version="0.4.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENV == "dev" else None,
    redoc_url="/redoc" if settings.ENV == "dev" else None,
    openapi_url="/openapi.json" if settings.ENV == "dev" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── PUBLIC REST ENDPOINTS ───────────────────────────────────────────────────────────────

@app.get("/api/health")
async def api_health():
    from .redis_client import redis_ready
    redis_ok = False
    if settings.REDIS_URL:
        redis_ok = await redis_ready()
    return {
        "status": "ok",
        "env": settings.ENV,
        "demo_mode": settings.DEMO_MODE,
        "apis_ready": {
            "abuseipdb": bool(settings.ABUSEIPDB_API_KEY),
            "cloudflare": bool(settings.CLOUDFLARE_API_KEY),
            "database": bool(settings.DATABASE_URL),
            "redis": redis_ok,
        },
    }


@app.get("/api/attacks/today")
async def attacks_today():
    today_count = 0
    yesterday_count = None
    percent_change = None

    if settings.REDIS_URL:
        try:
            from .redis_client import get_today_counter, get_yesterday_counter
            today_count = await get_today_counter()
            yesterday_count = await get_yesterday_counter()
            if yesterday_count and yesterday_count > 0:
                percent_change = round(
                    ((today_count - yesterday_count) / yesterday_count) * 100, 1
                )
        except Exception as e:
            logger.warning("Redis unavailable for counter: %s", e)

    return {
        "utc_day": "today",
        "total": today_count,
        "by_type": {
            "SYN Flood": 0, "UDP Flood": 0, "HTTP Flood": 0,
            "DNS Amplification": 0, "NTP Amplification": 0,
            "ICMP Flood": 0, "Volumetric": 0, "Botnet-Driven": 0,
        },
        "previous_day_total": yesterday_count,
        "percent_change": percent_change,
        "data_freshness": "live" if settings.REDIS_URL else "stub",
    }


@app.get("/api/attacks/history")
def attacks_history():
    return {"points": [], "bucket_minutes": 5}


@app.get("/api/stats/top-countries")
def stats_top_countries():
    return {"top_target": [], "top_source": []}


@app.get("/api/stats/attack-types")
def stats_attack_types():
    return {"distribution": []}


@app.get("/api/country/{code}")
def country_detail(code: str):
    from .geoip import get_country_name
    return {
        "country_code": code.upper(),
        "country_name": get_country_name(code),
        "incoming_today": 0,
        "outgoing_today": 0,
        "top_attack_types": [],
        "top_sources": [],
        "top_targets": [],
        "severity_level": "Low",
        "history_24h": [],
    }


# ── INTERNAL ENDPOINTS ───────────────────────────────────────────────────────────────

@app.post("/api/ingest", dependencies=[Depends(require_internal_key)])
def ingest_event():
    return {"ok": False, "reason": "Not implemented yet — Step 5"}


@app.post("/api/predict", dependencies=[Depends(require_internal_key)])
def predict_event():
    return {"ok": False, "reason": "Not implemented yet — Step 5"}


# ── WEBSOCKET ────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/attacks")
async def ws_attacks(websocket: WebSocket):
    from .ws_manager import manager
    from .redis_client import get_recent_attacks

    await websocket.accept()
    manager.register(websocket)

    try:
        # 1. Hello frame
        await websocket.send_json({
            "type": "connected",
            "message": "DDoS Monitor WebSocket ready",
            "demo_mode": settings.DEMO_MODE,
        })

        # 2. Send last 100 attacks immediately (fast page load)
        if settings.REDIS_URL:
            try:
                recent = await get_recent_attacks(100)
                if recent:
                    await websocket.send_json({
                        "type": "initial_batch",
                        "attacks": recent,
                        "count": len(recent),
                    })
            except Exception as e:
                logger.warning("Could not load recent attacks from Redis: %s", e)

        # 3. Keep connection alive — new attacks arrive via Redis pub/sub listener
        while True:
            await websocket.receive_text()  # waits for ping or close frame

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WebSocket error: %s", e)
    finally:
        manager.unregister(websocket)
