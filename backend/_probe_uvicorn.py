"""Run uvicorn in a thread, hit it via requests, then kill."""
import os
import sys
import time
import threading
import json
from urllib.parse import urljoin

# Ensure SITE_ACCESS_PASSWORD is empty so SiteBasicAuth is a no-op
os.environ.pop("SITE_ACCESS_PASSWORD", None)
os.environ.pop("SITE_ACCESS_USER", None)
sys.path.insert(0, os.path.dirname(__file__))

import uvicorn
from db.database import init_db
from main import app


def _run():
    config = uvicorn.Config(app=app, host="127.0.0.1", port=8766, log_level="warning", lifespan="off")
    server = uvicorn.Server(config)
    server.run()


async def setup_db():
    await init_db()


def main():
    import asyncio
    asyncio.run(setup_db())

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    time.sleep(4)  # wait for startup

    try:
        import urllib.request
        import urllib.parse
        import base64

        base = "http://127.0.0.1:8766"

        def post(path, data, headers=None):
            headers = headers or {}
            headers["Content-Type"] = "application/json"
            req = urllib.request.Request(
                urljoin(base, path),
                data=json.dumps(data).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as r:
                    return r.status, r.read().decode("utf-8")
            except urllib.error.HTTPError as e:
                return e.code, e.read().decode("utf-8")

        def get(path, headers=None):
            req = urllib.request.Request(urljoin(base, path), headers=headers or {})
            try:
                with urllib.request.urlopen(req, timeout=10) as r:
                    return r.status, r.read().decode("utf-8")
            except urllib.error.HTTPError as e:
                return e.code, e.read().decode("utf-8")

        # Login
        s, body = post("/api/auth/login", {"login": "demo", "password": "demo"})
        print(f"login: {s}")
        if s != 200:
            print("  body:", body[:300])
            return
        token = json.loads(body)["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        # /api/banking/balance/summary
        s, body = get("/api/banking/balance/summary", headers=auth)
        print(f"\nGET /api/banking/balance/summary -> {s}")
        if s == 200:
            d = json.loads(body)
            print(f"  total_byn={d['total_byn']} total_eur={d['total_eur']} "
                  f"total_usd={d['total_usd']} total_rub={d['total_rub']}")
            print(f"  accounts: {len(d['accounts'])}")
            for a in d["accounts"]:
                print(f"    {a['iban'][-8:]} {a['currency']} {a['balance']:.2f} {a['label']!r}")
            print(f"  history:  {len(d['history'])} months")
            for h in d["history"]:
                print(f"    {h['month']} {h['label']}: net={h['amount']:+.2f} d={h['debit']:.2f} c={h['credit']:.2f}")
        else:
            print("  body:", body[:300])

        # /api/chat/guest with balance query
        s, body = post("/api/chat/guest", {"message": "Сколько на счёте?", "org_id": "demo"})
        print(f"\nPOST /api/chat/guest 'Сколько на счёте?' -> {s}")
        if s == 200:
            d = json.loads(body)
            print(f"  message head: {d['message'][:200]}")
            cp = d.get("chart_payload")
            if cp:
                print(f"  chart_payload.type: {cp['type']}")
                print(f"  chart_payload.data.totals: BYN={cp['data']['total_byn']:.2f} "
                      f"USD={cp['data']['total_usd']:.2f} EUR={cp['data']['total_eur']:.2f} "
                      f"RUB={cp['data']['total_rub']:.2f}")
                print(f"  chart_payload.bar labels: {cp['bar']['labels']}")
                print(f"  chart_payload.bar values: {cp['bar']['values']}")
                print(f"  chart_payload.line labels: {cp['line']['labels']}")
                print(f"  chart_payload.line values: {cp['line']['values']}")
            else:
                print("  chart_payload: <missing>")
            print(f"  charts: {len(d.get('charts') or [])}")
            for c in d.get("charts") or []:
                print(f"    - {c['type']} {c['title']} labels={c['labels']}")
            print(f"  action_buttons: {[b['label'] for b in (d.get('action_buttons') or [])]}")
        else:
            print("  body:", body[:300])

    finally:
        # Find and kill uvicorn
        import subprocess
        subprocess.run(["powershell", "-Command",
                        "Get-NetTCPConnection -LocalPort 8766 -ErrorAction SilentlyContinue | "
                        "ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"],
                       capture_output=True)


if __name__ == "__main__":
    main()
