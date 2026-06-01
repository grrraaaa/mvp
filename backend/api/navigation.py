"""Navigation map route."""
from __future__ import annotations
from fastapi import APIRouter
from services.navigation.navigation_service import NavigationService
from models.schemas import NavigationStep

router = APIRouter()
_nav = NavigationService()


@router.get("/map")
async def get_map():
    return _nav.get_full_map()


@router.get("/path/{section}", response_model=list[NavigationStep])
async def get_path(section: str):
    from fastapi import HTTPException
    path = _nav.get_path(section)
    if path is None:
        raise HTTPException(404, f"Section '{section}' not found")
    return path
