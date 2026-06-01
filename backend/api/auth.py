"""Auth routes: register, login."""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db.models import User
from models.schemas import LoginRequest, RegisterRequest, TokenResponse
from core.dependencies import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(id=str(uuid.uuid4()), email=req.email, password_hash=hash_password(req.password))
    db.add(user)
    await db.commit()
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/guest", response_model=TokenResponse)
async def guest_login(db: AsyncSession = Depends(get_db)):
    """Create a temporary guest account for demo purposes."""
    import secrets
    email = f"guest_{secrets.token_hex(6)}@guest.local"
    user = User(id=str(uuid.uuid4()), email=email, password_hash=hash_password(secrets.token_hex(16)))
    db.add(user)
    await db.commit()
    return TokenResponse(access_token=create_access_token(user.id))
