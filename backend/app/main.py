from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import Base, engine
from app.database import models  # noqa: F401

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.projects import router as projects_router
from app.api.settings import router as settings_router


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AUREX AI API",
    version="2.0.0",
    description="AUREX AI full-stack assistant API",
)


# =========================================================
# CORS
# =========================================================

ALLOWED_ORIGINS = [
    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # Production Vercel URL
    "https://aurex-ai-gray.vercel.app",

    # Current Vercel deployment URL
    "https://aurex-aub2ckv9m-shen-d3e5.vercel.app",
]


# Also allow the configured frontend URL if it is different
if (
    settings.FRONTEND_URL
    and settings.FRONTEND_URL not in ALLOWED_ORIGINS
):
    ALLOWED_ORIGINS.append(settings.FRONTEND_URL)


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://aurex-[a-z0-9-]+-shen-d3e5\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(projects_router)
app.include_router(settings_router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "AUREX AI API is running",
        "version": "2.0.0",
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
    }