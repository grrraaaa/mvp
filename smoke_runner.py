"""
Workflow_demo.md smoke test, pure-Python, без PowerShell.
Читает smoke_cases.json, кидает POST /api/chat/guest, пишет smoke_<ts>.json + smoke_report.txt.
"""
import json
import urllib.request
import urllib.error
import sys
import os
import io
from datetime import datetime

CASES_PATH = r"C:\Users\New\Desktop\sber\mvp\smoke_cases.json"
OUT_DIR   = r"C:\Users\New\Desktop\sber\mvp"
BASE_URL  = "http://127.0.0.1:8000/api/chat/guest"
TIMEOUT   = 120

def run_one(case):
    name = case["name"]
    body = case["body"]
    to   = int(case.get("to", 90))
    entry = {"name": name, "request": body, "ts": datetime.now().strftime("%H:%M:%S")}
    try:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            BASE_URL,
            data=data,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=to) as r:
            raw = r.read().decode("utf-8")
        parsed = json.loads(raw)
        entry["status"] = "OK"
        entry["message"] = parsed.get("message", "")
        if parsed.get("navigation_path"):
            entry["nav"] = " / ".join(f"{s.get('label')} -> {s.get('url')}" for s in parsed["navigation_path"])
        if parsed.get("action_buttons"):
            entry["buttons"] = "; ".join(f"{b.get('label')} -> {b.get('url')}" for b in parsed["action_buttons"])
        entry["sources"] = len(parsed.get("sources") or [])
        if parsed.get("form_actions"):
            entry["form_actions"] = "; ".join(f"{a.get('field')}={a.get('value')}" for a in parsed["form_actions"])
    except Exception as e:
        entry["status"] = "FAIL"
        entry["error"] = str(e)[:300]
    return entry

def main():
    with open(CASES_PATH, "r", encoding="utf-8") as f:
        cases = json.load(f)

    results = []
    for case in cases:
        entry = run_one(case)
        results.append(entry)
        if entry["status"] == "OK":
            print(f"  [OK]   {entry['name']}")
        else:
            print(f"  [FAIL] {entry['name']} -- {entry.get('error','')[:120]}")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = os.path.join(OUT_DIR, f"smoke_{ts}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nJSON saved: {json_path}")

    # decoded report
    ok = sum(1 for r in results if r["status"] == "OK")
    fail = len(results) - ok
    buf = io.StringIO()
    buf.write("=" * 70 + "\n")
    buf.write(f"WORKFLOW_DEMO.md SMOKE {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    buf.write("=" * 70 + "\n")
    buf.write(f"Total: {len(results)} | OK: {ok} | FAIL: {fail}\n\n")
    for r in results:
        if r["status"] == "FAIL":
            buf.write(f"[FAIL] {r['name']}: {r.get('error','')[:200]}\n")
            continue
        buf.write(f"[OK] {r['name']}\n")
        if r.get("nav"):            buf.write(f"  nav : {r['nav']}\n")
        if r.get("buttons"):        buf.write(f"  btn : {r['buttons'][:200]}\n")
        if r.get("form_actions"):   buf.write(f"  form: {r['form_actions']}\n")
        if r.get("sources"):        buf.write(f"  src : {r['sources']} hits\n")
        msg = (r.get("message") or "").replace("\n", " / ")
        buf.write(f"  msg : {msg[:220]}\n")
        buf.write("\n")
    report_path = os.path.join(OUT_DIR, "smoke_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(buf.getvalue())
    print(f"Report: {report_path}")
    print(f"\n>>> Total: ok={ok} fail={fail} <<<")

if __name__ == "__main__":
    main()
