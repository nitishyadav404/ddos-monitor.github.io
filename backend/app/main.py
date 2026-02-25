from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .security import require_internal_key

settings = get_settings()

app = FastAPI(
    title="DDoS Monitor API",
    version="0.1.0",
    # Hide internal endpoints from public Swagger docs in prod
    docs_url="/docs" if settings.ENV == "dev" else None,
    redoc_url="/redoc" if settings.ENV == "dev" else None,
    openapi_url="/openapi.json" if settings.ENV == "dev" else None,
)

# ── CORS — reads from .env, never hardcoded ─────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC REST ENDPOINTS  (WRD-aligned, stubs for now)
# These return safe empty shapes that the frontend can consume immediately.
# Real data wires in when DB + Redis are connected (Step 3+).
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def api_health():
    return {
        "status": "ok",
        "env": settings.ENV,
        "demo_mode": settings.DEMO_MODE,
        "apis_ready": {
            "abuseipdb": bool(settings.ABUSEIPDB_API_KEY),
            "cloudflare": bool(settings.CLOUDFLARE_API_KEY),
            "database": bool(settings.DATABASE_URL),
            "redis": bool(settings.REDIS_URL),
        },
    }


@app.get("/api/attacks/today")
def attacks_today():
    """
    Returns 24h attack totals (resets at UTC midnight).
    Also returns previous_day_total so frontend can display
    'Yesterday: X attacks' — prevents users visiting at 00:01 UTC
    from thinking the site is broken when today's count is near zero.
    """
    return {
        "utc_day": "today",
        "total": 0,
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
        "previous_day_total": None,
        "data_freshness": "stub",
    }


@app.get("/api/attacks/history")
def attacks_history():
    """
    Returns 24h time-series in 5-minute buckets.
    Each point: { timestamp_utc, count }
    """
    return {"points": [], "bucket_minutes": 5}


@app.get("/api/stats/top-countries")
def stats_top_countries():
    """
    Returns top 10 most targeted AND top 10 source countries today.
    Each entry: { country_code, country_name, count, primary_attack_type }
    """
    return {"top_target": [], "top_source": []}


@app.get("/api/stats/attack-types")
def stats_attack_types():
    """
    Returns proportional breakdown of attack types today.
    Each entry: { type, count, percentage }
    """
    return {"distribution": []}


@app.get("/api/country/{code}")
def country_detail(code: str):
    """
    Country-specific stats — used by country detail modal.
    Returns incoming/outgoing breakdown, top attack types,
    top source countries, and 24h mini time-series.
    """
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
# INTERNAL ENDPOINTS — protected by X-Internal-Key header
# The cron job + ML pipeline use these. Public internet gets 401.
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/ingest", dependencies=[Depends(require_internal_key)])
def ingest_event():
    """
    Called by the cron job after normalising AbuseIPDB / Cloudflare data.
    Will store to DB and push to Redis pub/sub in Step 3.
    """
    return {"ok": False, "reason": "Not implemented yet — Step 3"}


@app.post("/api/predict", dependencies=[Depends(require_internal_key)])
def predict_event():
    """
    Called internally after ingestion to classify attack type + severity.
    Will run ML model inference in Step 5.
    """
    return {"ok": False, "reason": "Not implemented yet — Step 5"}


# ─────────────────────────────────────────────────────────────────────────────
# WEBSOCKET  — live attack stream
# Path: ws://localhost:8000/ws/attacks
# Matches frontend VITE_WS_URL exactly.
# ─────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/attacks")
async def ws_attacks(websocket: WebSocket):
    await websocket.accept()
    try:
        # Send a hello frame so frontend knows the socket is alive.
        await websocket.send_json({
            "type": "connected",
            "message": "DDoS Monitor WebSocket ready",
            "demo_mode": settings.DEMO_MODE,
        })
        # Keep-alive loop: echo client pings.
        # In Step 6, we replace this with Redis pub/sub broadcast.
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "pong", "data": data})
    except WebSocketDisconnect:
        return
