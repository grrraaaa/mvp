"""Async in-process integration test using httpx.AsyncClient."""
import os
import sys
import asyncio
import json

# Ensure SITE_ACCESS_PASSWORD is empty so SiteBasicAuth is a no-op
os.environ.pop("SITE_ACCESS_PASSWORD", None)
os.environ.pop("SITE_ACCESS_USER", None)
sys.path.insert(0, os.path.dirname(__file__))


async def main():
    import httpx
    from db.database import init_db
    from main import app

    await init_db()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Login
        r = await client.post("/api/auth/login", json={"login": "demo", "password": "demo"})
        print(f"login: {r.status_code}")
        if r.status_code != 200:
            print("  body:", r.text[:300])
            return
        token = r.json()["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        print()
        print("=" * 60)
        print("GET /api/banking/balance/summary")
        r = await client.get("/api/banking/balance/summary", headers=auth)
        print(f"  status: {r.status_code}")
        if r.status_code == 200:
            d = r.json()
            print(f"  total_byn={d['total_byn']} total_eur={d['total_eur']} "
                  f"total_usd={d['total_usd']} total_rub={d['total_rub']}")
            print(f"  accounts: {len(d['accounts'])}")
            for a in d["accounts"]:
                print(f"    {a['iban'][-8:]} {a['currency']} {a['balance']:.2f} {a['label']!r}")
            print(f"  history:  {len(d['history'])} months")
            for h in d["history"]:
                print(f"    {h['month']} {h['label']}: net={h['amount']:+.2f} "
                      f"d={h['debit']:.2f} c={h['credit']:.2f}")
        else:
            print("  body:", r.text[:300])

        print()
        print("=" * 60)
        print("POST /api/chat/guest 'Сколько на счёте?'")
        r = await client.post(
            "/api/chat/guest",
            json={"message": "Сколько на счёте?", "org_id": "demo"},
        )
        print(f"  status: {r.status_code}")
        if r.status_code == 200:
            d = r.json()
            print(f"  message head: {d['message'][:200]}")
            cp = d.get("chart_payload")
            if cp:
                print(f"  chart_payload.type: {cp['type']}")
                print(f"  chart_payload.data.totals: BYN={cp['data']['total_byn']:.2f} "
                      f"USD={cp['data']['total_usd']:.2f} EUR={cp['data']['total_eur']:.2f} "
                      f"RUB={cp['data']['total_rub']:.2f}")
                print(f"  chart_payload.bar: {cp['bar']['labels']} = {cp['bar']['values']}")
                print(f"  chart_payload.line: {cp['line']['labels']} = {cp['line']['values']}")
            else:
                print("  chart_payload: <missing>")
            print(f"  charts: {len(d.get('charts') or [])}")
            for c in d.get("charts") or []:
                print(f"    - {c['type']} {c['title']} labels={c['labels']}")
            print(f"  action_buttons: {[b['label'] for b in (d.get('action_buttons') or [])]}")
            print(f"  sources: {[s['label'] for s in (d.get('sources') or [])]}")
        else:
            print("  body:", r.text[:300])


if __name__ == "__main__":
    asyncio.run(main())
