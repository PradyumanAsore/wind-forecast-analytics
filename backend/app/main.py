"""
Main FastAPI application entrypoint.
UK Wind Generation Forecast Analysis Platform.
Configures CORS, middleware, API routers, health checks, and global error handling.
"""
from datetime import datetime
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.endpoints import router as api_router
from app.core.config import settings
from app.services.time_utils import UTC_TZ

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Specialized energy analytics platform for UK wholesale day-ahead electricity procurement. "
        "Evaluates Elexon BMRS WINDFOR forecasts against FUELHH actual wind generation outturns "
        "using rigorous Day-Ahead decision gate-closure logic."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if isinstance(settings.cors_origins, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["System"])
async def health_check():
    """
    System health and configuration check endpoint.
    """
    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.environment,
        "timestampUtc": datetime.now(UTC_TZ).isoformat(),
        "defaultDecisionCutoff": f"D-1 at {settings.default_decision_cutoff_time} ({settings.timezone})",
        "alignmentMethod": settings.alignment_method,
        "elexonBaseUrl": settings.elexon_api_base_url,
        "localCacheEnabled": settings.enable_local_cache
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Graceful exception handling preventing raw stack traces from leaking to client.
    """
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the energy analytics request.",
            "detail": str(exc) if settings.environment == "development" else "Please contact the platform administrator."
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
