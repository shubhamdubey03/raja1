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

# ── Global Exception Handlers ────────────────────────────────
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.exceptions import AppException

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom application exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": exc.error_code,
            "data": None
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle Starlette/FastAPI HTTPExceptions."""
    # Try to map status code to a human readable error code
    error_code = "HTTP_ERROR"
    if exc.status_code == 401:
        error_code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        error_code = "FORBIDDEN"
    elif exc.status_code == 404:
        error_code = "NOT_FOUND"
    elif exc.status_code == 405:
        error_code = "METHOD_NOT_ALLOWED"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": error_code,
            "data": None
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle FastAPI validation errors."""
    errors = exc.errors()
    message = "Validation failed"
    if errors:
        # Construct a friendly message from the first validation error
        err = errors[0]
        field = " -> ".join([str(loc) for loc in err.get("loc", []) if loc != "body"])
        message = f"Field validation failed: {field} ({err.get('msg', 'invalid value')})"

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": message,
            "error_code": "VALIDATION_ERROR",
            "data": {"errors": errors}
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle generic/unexpected exceptions."""
    logger.exception("unhandled_exception", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error occurred",
            "error_code": "INTERNAL_SERVER_ERROR",
            "data": None
        }
    )


# ── Static Uploads Mount ─────────────────────────────────────
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
from app.routers.notification import router as notification_router  # noqa: E402
from app.api.v1.categories import router as category_router  # noqa: E402

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(product_router, prefix=settings.api_v1_prefix)
app.include_router(order_router, prefix=settings.api_v1_prefix)
app.include_router(admin_router, prefix=settings.api_v1_prefix)
app.include_router(discount_router, prefix=settings.api_v1_prefix)
app.include_router(notification_router, prefix=settings.api_v1_prefix)
app.include_router(category_router, prefix=settings.api_v1_prefix)
