"""Auth routes: register, login."""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from db.database import get_db
from db.models import OrganizationProfile, User
from models.schemas import AuthUserOut, LoginRequest, RegisterRequest, TokenResponse
from core.dependencies import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


async def _user_to_auth_out(user: User, db: AsyncSession) -> AuthUserOut:
    org = await db.get(OrganizationProfile, user.org_id or "demo")
    org_name = org.org_name if org else "DEMO ЮРИДИЧЕСКОЕ ЛИЦО"
    role = org.user_role if org else "businessman"
    return AuthUserOut(
        id=user.id,
        login=user.login or user.email.split("@")[0],
        org_id=user.org_id or "demo",
        org_name=org_name,
        display_name=user.display_name,
        user_role=role,
    )


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=req.email,
        login=req.email.split("@")[0],
        password_hash=hash_password(req.password),
        org_id="demo",
        display_name=req.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    auth_user = await _user_to_auth_out(user, db)
    return TokenResponse(access_token=create_access_token(user.id), user=auth_user)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier = (req.login or req.email or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Укажите логин")

    result = await db.execute(
        select(User).where(
            or_(User.login == identifier, User.email == identifier)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    auth_user = await _user_to_auth_out(user, db)
    return TokenResponse(access_token=create_access_token(user.id), user=auth_user)


@router.get("/me", response_model=AuthUserOut)
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _user_to_auth_out(current_user, db)


@router.post("/guest", response_model=TokenResponse)
async def guest_login(db: AsyncSession = Depends(get_db)):
    """Create a temporary guest account for demo purposes."""
    import secrets
    email = f"guest_{secrets.token_hex(6)}@guest.local"
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        login=f"guest_{secrets.token_hex(4)}",
        password_hash=hash_password(secrets.token_hex(16)),
        org_id="demo",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    auth_user = await _user_to_auth_out(user, db)
    return TokenResponse(access_token=create_access_token(user.id), user=auth_user)
