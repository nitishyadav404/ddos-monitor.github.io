import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .security import require_internal_key

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Startup / Shutdown ────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    logger.info("Starting DDoS Monitor API (env=%s)", settings.ENV)

    # Create all DB tables if they don’t exist (idempotent)
    if settings.DATABASE_URL:
        try:
            from .database import get_engine, Base
            import app.models  # noqa — ensures all models are registered
            async with get_engine().begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables verified/created")
        except Exception as e:
            logger.error("DB startup error (continuing): %s", e)
    else:
        logger.warning("DATABASE_URL not set — running without database")

    # Start the scheduler (ingestion cron jobs)
    if settings.DATABASE_URL or settings.REDIS_URL:
        try:
            from .ingestion.scheduler import start_scheduler
            start_scheduler()
        except Exception as e:
            logger.error("Scheduler startup error (continuing): %s", e)
    else:
        logger.warning("No DB or Redis — scheduler not started")

    yield

    # ── SHUTDOWN ──
    logger.info("Shutting down DDoS Monitor API")
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
    version="0.1.0",
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


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC REST ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

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

    if settings.REDIS_URL:
        try:
            from .redis_client import get_today_counter, get_yesterday_counter
            today_count = await get_today_counter()
            yesterday_count = await get_yesterday_counter()
        except Exception as e:
            logger.warning("Redis unavailable for today counter: %s", e)

    percent_change = None
    if yesterday_count and yesterday_count > 0:
        percent_change = round(
            ((today_count - yesterday_count) / yesterday_count) * 100, 1
        )

    return {
        "utc_day": "today",
        "total": today_count,
        "by_type": {
            "SYN Flood": 0,
            "UDP Flood": 0,
            "HTTP Flood": 0,
            "DNS Amplification": 0,
            "NTP Amplification": 0,
            "ICMP Flood": 0,
            "Volumetric": 0,
            "Botnet-Driven": 0,
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
    return {
        "country_code": code.upper(),
        "country_name": None,
        "incoming_today": 0,
        "outgoing_today": 0,
        "top_attack_types": [],
        "top_sources": [],
        "top_targets": [],
        "severity_level": "Low",
        "history_24h": [],
    }


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL ENDPOINTS — protected, not shown in public docs
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/ingest", dependencies=[Depends(require_internal_key)])
def ingest_event():
    return {"ok": False, "reason": "Not implemented yet — Step 5"}


@app.post("/api/predict", dependencies=[Depends(require_internal_key)])
def predict_event():
    return {"ok": False, "reason": "Not implemented yet — Step 5"}


# ─────────────────────────────────────────────────────────────────────────────
# WEBSOCKET — live attack stream
# ws://localhost:8000/ws/attacks  (matches VITE_WS_URL)
# ─────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/attacks")
async def ws_attacks(websocket: WebSocket):
    await websocket.accept()
    try:
        # Send hello frame with current state
        await websocket.send_json({
            "type": "connected",
            "message": "DDoS Monitor WebSocket ready",
            "demo_mode": settings.DEMO_MODE,
        })

        # Send recent attacks immediately for fast page load
        if settings.REDIS_URL:
            try:
                from .redis_client import get_recent_attacks
                recent = await get_recent_attacks(100)
                if recent:
                    await websocket.send_json({
                        "type": "initial_batch",
                        "attacks": recent,
                    })
            except Exception as e:
                logger.warning("Could not load recent attacks from Redis: %s", e)

        # Keep-alive: echo pings, await Redis pub/sub in Step 6
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        return
    except Exception as e:
        logger.error("WebSocket error: %s", e)
