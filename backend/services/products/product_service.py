"""Product search service."""
from __future__ import annotations
from typing import Optional, List, Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import AsyncSessionLocal
from db.models import Product
from models.schemas import BankProduct


class ProductService:
    async def search(self, params: Dict[str, Any]) -> List[BankProduct]:
        try:
            return await self._search(params)
        except Exception:
            return []

    async def _search(self, params: Dict[str, Any]) -> List[BankProduct]:
        async with AsyncSessionLocal() as db:
            q = select(Product).where(Product.is_active == True)
            ptype = params.get("product_type")
            max_rate = params.get("max_rate")
            if ptype:
                q = q.where(Product.type == ptype)
            if max_rate is not None:
                q = q.where(Product.rate <= max_rate)
            q = q.order_by(Product.rate.asc())
            result = await db.execute(q)
            rows = result.scalars().all()
            return [
                BankProduct(id=p.id, name=p.name, type=p.type,
                            rate=p.rate, description=p.description, url=p.url)
                for p in rows
            ]
