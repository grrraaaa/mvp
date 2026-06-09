"""Authenticate as guest, then exercise document search."""
from __future__ import annotations
import json
import sys
import urllib.parse
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def post(path: str, body: dict | None = None) -> tuple[int, str]:
    data = json.dumps(body or {}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def get(path: str, token: str | None = None) -> tuple[int, str]:
    req = urllib.request.Request(f"{BASE}{path}")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def show(label: str, body: str, status: int) -> None:
    print(f"\n=== {label}  -> {status} ===")
    try:
        parsed = json.loads(body)
        if isinstance(parsed, list):
            print(f"  list of {len(parsed)}:")
            for item in parsed[:6]:
                if isinstance(item, dict):
                    keys = list(item.keys())[:6]
                    print(f"    { {k: item[k] for k in keys} }")
                else:
                    print(f"    {item}")
        elif isinstance(parsed, dict):
            for k in list(parsed.keys())[:8]:
                v = parsed[k]
                if isinstance(v, (dict, list)):
                    print(f"  {k}: {json.dumps(v, ensure_ascii=False)[:300]}")
                else:
                    print(f"  {k}: {v}")
        else:
            print(f"  {parsed}")
    except Exception:
        print(body[:1500])


# 1. login as guest
status, body = post("/api/auth/guest")
print(f"\n[guest login] {status}")
token = None
if status == 200:
    try:
        token = json.loads(body).get("access_token")
        print(f"  token: {token[:30]}...")
    except Exception:
        pass

if not token:
    print("Cannot proceed without token")
    sys.exit(1)

# 2. exercise search
queries = [
    ("покажи отчёт номер 211", "отчёт номер 211"),
    ("найди №211", "найди №211"),
    ("покажи документ 211", "документ 211"),
    ("покажи отчёт", "no number"),
    ("отчёт март 2025", "month + year, no number"),
    ("покажи платёж 1000", "сумма 1000"),
]

for label, q in queries:
    path = f"/api/banking/search?q={urllib.parse.quote(q)}&org_id=demo"
    s, b = get(path, token)
    show(f"search: {label}", b, s)

# 3. list raw documents
s, b = get("/api/banking/documents?org_id=demo", token)
show("list /api/banking/documents", b, s)
