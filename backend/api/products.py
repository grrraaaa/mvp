"""Products catalogue route."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db.models import Product
from models.schemas import BankProduct

router = APIRouter()


@router.get("", response_model=list[BankProduct])
async def list_products(
    type: Optional[str] = Query(None),
    max_rate: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Product).where(Product.is_active == True)
    if type:
        q = q.where(Product.type == type)
    if max_rate is not None:
        q = q.where(Product.rate <= max_rate)
    q = q.order_by(Product.rate.asc())
    result = await db.execute(q)
    products = result.scalars().all()
    return [BankProduct(id=p.id, name=p.name, type=p.type, rate=p.rate,
                        description=p.description, url=p.url) for p in products]


@router.get("/{product_id}", response_model=BankProduct)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(select(Product).where(Product.id == product_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    return BankProduct(id=p.id, name=p.name, type=p.type, rate=p.rate,
                       description=p.description, url=p.url)
