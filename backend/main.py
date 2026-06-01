from __future__ import annotations
import sys
import os

# Add backend dir to path so imports work without install
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api import auth, chat, products, navigation, forms
from db.database import init_db
from core.config import settings
from core.site_auth import SiteBasicAuthMiddleware

IS_VERCEL = os.getenv("VERCEL") == "1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not IS_VERCEL:
        await init_db()
    yield


app = FastAPI(
    title="SberAI Assistant API",
    description="AI-ассистент для банковского приложения с 3D-навигацией",
    version="0.1.0",
    lifespan=None if IS_VERCEL else lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Последний = внешний: пароль на весь API (как Next.js middleware)
app.add_middleware(SiteBasicAuthMiddleware)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(navigation.router, prefix="/api/navigation", tags=["navigation"])
app.include_router(forms.router, prefix="/api/forms", tags=["forms"])


@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "0.1.0",
        "db": "postgres" if "postgresql" in os.getenv("POSTGRES_URL", os.getenv("DATABASE_URL", "")) else "sqlite",
        "ai_mode": settings.ai_provider,
    }
