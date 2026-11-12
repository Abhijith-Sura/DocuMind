"""
FastAPI Application Entry Point — DocuMind AI Backend
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.config import get_settings
from app.core.database import init_db
from app.api.routes import auth, documents, query, evaluation

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("🚀 DocuMind AI starting up...")
    await init_db()  # Create DB tables
    logger.info("✅ Database initialized")

    # Create upload directory
    import os
    os.makedirs(settings.upload_dir, exist_ok=True)
    logger.info(f"✅ Upload directory ready: {settings.upload_dir}")

    yield  # App is running

    # Shutdown
    logger.info("👋 DocuMind AI shutting down...")


app = FastAPI(
    title="DocuMind AI",
    description="Enterprise RAG Document Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Routes ─────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")
app.include_router(evaluation.router, prefix="/api/v1")


# ── Health Check ───────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "DocuMind AI API",
        "docs": "/docs",
        "health": "/health",
    }
