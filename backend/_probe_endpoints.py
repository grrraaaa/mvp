"""In-process FastAPI integration check — bypasses need for live server."""
import sys, os, asyncio, json

# Ensure SITE_ACCESS_PASSWORD is empty so SiteBasicAuth is a no-op
os.environ.pop("SITE_ACCESS_PASSWORD", None)
os.environ.pop("SITE_ACCESS_USER", None)

sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from db.database import init_db
from main import app


async def setup():
    await init_db()


def main():
    asyncio.run(setup())
    client = TestClient(app)

    # Login to obtain JWT
    r = client.post("/api/auth/login", json={"login": "demo", "password": "demo"})
    print("login status:", r.status_code)
    if r.status_code != 200:
        print("login body:", r.text[:200])
        return
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print()
    print("=" * 60)
    print("GET /api/banking/balance/summary")
    r = client.get("/api/banking/balance/summary", headers=headers)
    print(f"  status: {r.status_code}")
    if r.status_code != 200:
        print("  body:", r.text[:300])
        return
    data = r.json()
    print(f"  total_byn: {data['total_byn']}")
    print(f"  total_eur: {data['total_eur']}")
    print(f"  total_usd: {data['total_usd']}")
    print(f"  total_rub: {data['total_rub']}")
    print(f"  accounts: {len(data['accounts'])} rows")
    print(f"  history:  {len(data['history'])} months")
    for a in data["accounts"]:
        print(f"    {a['iban'][-8:]} {a['currency']} {a['balance']:.2f} {a['label']!r}")
    for h in data["history"]:
        print(f"    {h['month']} {h['label']}: net={h['amount']:+.2f}")

    print()
    print("=" * 60)
    print("POST /api/chat/guest (message='Сколько на счёте?')")
    r = client.post(
        "/api/chat/guest",
        json={"message": "Сколько на счёте?", "org_id": "demo"},
    )
    print(f"  status: {r.status_code}")
    body = r.json()
    print(f"  message (head): {body['message'][:240]}")
    print(f"  charts: {len(body.get('charts') or [])}")
    for c in body.get("charts") or []:
        print(f"    - {c['type']} {c['title']} labels={c['labels'][:3]}")
    cp = body.get("chart_payload")
    if cp:
        print(f"  chart_payload.type: {cp['type']}")
        print(f"  chart_payload.data.totals: BYN={cp['data']['total_byn']:.2f} "
              f"USD={cp['data']['total_usd']:.2f} EUR={cp['data']['total_eur']:.2f} "
              f"RUB={cp['data']['total_rub']:.2f}")
        print(f"  chart_payload.bar: {cp['bar']['labels']} {cp['bar']['values']}")
        print(f"  chart_payload.line: {cp['line']['labels']} {cp['line']['values']}")
    else:
        print("  chart_payload: <missing>")
    print(f"  action_buttons: {[b['label'] for b in (body.get('action_buttons') or [])]}")
    print(f"  sources: {[s['label'] for s in (body.get('sources') or [])]}")

    print()
    print("=" * 60)
    print("Regression: 'сколько на счёте?' is NOT a search query")
    from services.banking.queries import is_search_query, is_balance_query
    assert not is_search_query("сколько на счёте?"), "search-query regression broken"
    assert is_balance_query("сколько на счёте?"), "balance-query detection broken"
    print("  PASS")


if __name__ == "__main__":
    main()
