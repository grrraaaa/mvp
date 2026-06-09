"""E2E: send 'наименование контрагента ООО Ромашка' to the live chat API and
verify it fills the form field instead of opening Counterparties section."""
from __future__ import annotations
import json
import sys
import urllib.parse
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def post(path: str, body: dict, token: str | None = None) -> tuple[int, str]:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


# 1. login as guest
status, body = post("/api/auth/guest", {})
if status != 200:
    print("guest login failed:", status, body)
    sys.exit(1)
token = json.loads(body)["access_token"]
print(f"[guest login] OK token={token[:24]}...")

# 2. simulate the user being on the paydoc form
session_id = "demo-session-form-fill"
form_type = "paydocby"
page_route = "/payments/paydocbyn"

# First, send "сумма 300" to start the form fill
status, body = post(
    "/api/chat",
    {"message": "сумма 300", "session_id": session_id, "form_type": form_type, "page_route": page_route},
    token=token,
)
print(f"\n[step 1: 'сумма 300']  {status}")
parsed = json.loads(body)
print("  message:", parsed.get("message", "")[:200])
print("  form_fill_status:", parsed.get("form_fill_status"))
print("  form_actions:", json.dumps(parsed.get("form_actions", []), ensure_ascii=False)[:300])

# 3. send "наименование контрагента ООО ромашка" — this is the bug case
status, body = post(
    "/api/chat",
    {"message": "наименование контрагента ООО ромашка", "session_id": session_id, "form_type": form_type, "page_route": page_route},
    token=token,
)
print(f"\n[step 2: 'наименование контрагента ООО ромашка']  {status}")
parsed = json.loads(body)
print("  message:", parsed.get("message", "")[:200])
print("  form_fill_status:", parsed.get("form_fill_status"))
print("  form_actions:", json.dumps(parsed.get("form_actions", []), ensure_ascii=False)[:400])
nav = parsed.get("navigation_path") or []
print("  navigation_path:", nav)

# 4. regression: 'открой контрагентов' should still open the section
status, body = post(
    "/api/chat",
    {"message": "открой контрагентов", "session_id": session_id + "-nav", "form_type": None, "page_route": "/payments/paydocbyn"},
    token=token,
)
print(f"\n[step 3: 'открой контрагентов'  (regression)]  {status}")
parsed = json.loads(body)
print("  message:", parsed.get("message", "")[:160])
print("  navigation_path:", parsed.get("navigation_path"))
print("  action_buttons:", json.dumps(
    [{"label": b.get("label"), "url": b.get("url")} for b in (parsed.get("action_buttons") or [])],
    ensure_ascii=False,
))
