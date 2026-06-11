"""Курсы валют: НБРБ + спред банка, fallback — демо-котировки."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

NBRB_URL = "https://api.nbrb.by/exrates/rates/{code}?parammode=2"
TRACKED = ("USD", "EUR", "RUB")

# Демо-котировки (как в интерфейсе СберБизнес), если НБРБ недоступен
DEMO_RATES: list[dict] = [
    {
        "code": "USD",
        "pair": "USD/BYN",
        "scale": 1,
        "buy": 3.2200,
        "sell": 3.2650,
        "nbrb": 3.2425,
    },
    {
        "code": "EUR",
        "pair": "EUR/BYN",
        "scale": 1,
        "buy": 3.4900,
        "sell": 3.5450,
        "nbrb": 3.5175,
    },
    {
        "code": "RUB",
        "pair": "RUB/BYN",
        "scale": 100,
        "buy": 3.4100,
        "sell": 3.4800,
        "nbrb": 3.4450,
    },
]

# Банк покупает чуть дешевле НБРБ, продаёт чуть дороже
BUY_MULT = 0.985
SELL_MULT = 1.015


async def _fetch_nbrb(code: str) -> dict | None:
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.get(NBRB_URL.format(code=code))
        if response.status_code != 200:
            return None
        data = response.json()
    official = float(data.get("Cur_OfficialRate") or 0)
    if official <= 0:
        return None
    scale = int(data.get("Cur_Scale") or 1)
    raw_date = (data.get("Date") or "")[:10]
    return {
        "code": code,
        "pair": f"{code}/BYN",
        "scale": scale,
        "buy": round(official * BUY_MULT, 4),
        "sell": round(official * SELL_MULT, 4),
        "nbrb": round(official, 4),
        "rate_date": raw_date or None,
    }


async def get_exchange_rates(*, live: bool = True) -> dict:
    """Вернуть котировки и метаданные для виджета."""
    rates: list[dict] = []
    source = "demo"
    rate_date: str | None = None

    if live:
        try:
            for code in TRACKED:
                row = await _fetch_nbrb(code)
                if row:
                    rates.append(row)
                    rate_date = row.get("rate_date") or rate_date
            if len(rates) == len(TRACKED):
                source = "nbrb"
        except Exception as exc:
            logger.warning("NBRB exchange rates failed: %s", exc)
            rates = []

    if not rates:
        rates = [dict(r) for r in DEMO_RATES]
        source = "demo"
        rate_date = "2026-05-31"

    now = datetime.now(timezone.utc).strftime("%H:%M")
    return {
        "rates": rates,
        "source": source,
        "rate_date": rate_date,
        "updated_at": now,
        "disclaimer": (
            "Курсы ориентировочные. При конверсии используется курс покупки "
            "(продажа валюты банку) или продажи (покупка валюты у банка)."
        ),
    }
