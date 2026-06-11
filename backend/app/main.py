"""
FastAPI Application — B2B Vendor & Retailer Management Platform.

Project Code: AMB-DMP-2026
Stack: FastAPI + PostgreSQL (async) + SQLAlchemy + Alembic
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware

from app.config import get_settings
from app.database import engine

settings = get_settings()

# ── Structured Logging ──────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
)
logger = structlog.get_logger()

# ── Rate Limiting ────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ── Lifespan ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("application_startup", app_name=settings.app_name, env=settings.app_env)
    yield
    await engine.dispose()
    logger.info("application_shutdown")


# ── App Factory ──────────────────────────────────────────────
app = FastAPI(
    title="AMB-DMP-2026 — B2B Platform API",
    description="B2B Vendor & Retailer Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ───────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# ── Health Check (P1-05) ────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint — returns 200 for monitoring."""
    return {"status": "healthy", "app": settings.app_name, "env": settings.app_env}


# ── Register Routers ────────────────────────────────────────
from app.routers.auth import router as auth_router  # noqa: E402
from app.routers.product import router as product_router  # noqa: E402
from app.routers.order import router as order_router  # noqa: E402
from app.routers.admin import router as admin_router  # noqa: E402
from app.routers.discount import router as discount_router  # noqa: E402

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(product_router, prefix=settings.api_v1_prefix)
app.include_router(order_router, prefix=settings.api_v1_prefix)
app.include_router(admin_router, prefix=settings.api_v1_prefix)
app.include_router(discount_router, prefix=settings.api_v1_prefix)
