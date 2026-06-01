<<<<<<< HEAD
from __future__ import annotations
import sys
import os

# Add backend dir to path so imports work without install
sys.path.insert(0, os.path.dirname(__file__))

=======
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

<<<<<<< HEAD
from api import auth, chat, products, navigation, forms
from db.database import init_db
from core.config import settings
from core.site_auth import SiteBasicAuthMiddleware

IS_VERCEL = os.getenv("VERCEL") == "1"
=======
from api import auth, chat, products, navigation
from db.database import init_db
from core.config import settings
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42


@asynccontextmanager
async def lifespan(app: FastAPI):
<<<<<<< HEAD
    if not IS_VERCEL:
        await init_db()
    yield
=======
    # Startup
    await init_db()
    yield
    # Shutdown
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42


app = FastAPI(
    title="SberAI Assistant API",
<<<<<<< HEAD
    description="AI-ассистент для банковского приложения с 3D-навигацией",
    version="0.1.0",
    lifespan=None if IS_VERCEL else lifespan,
=======
    description="AI-ассистент для банковского приложения",
    version="0.1.0",
    lifespan=lifespan,
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
)

app.add_middleware(
    CORSMiddleware,
<<<<<<< HEAD
    allow_origins=["*"],
=======
    allow_origins=settings.ALLOWED_ORIGINS,
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
<<<<<<< HEAD
# Последний = внешний: пароль на весь API (как Next.js middleware)
app.add_middleware(SiteBasicAuthMiddleware)

=======

# Роуты
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(navigation.router, prefix="/api/navigation", tags=["navigation"])
<<<<<<< HEAD
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
=======


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
