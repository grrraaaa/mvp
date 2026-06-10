import asyncio
import sys
sys.path.insert(0, 'C:/Users/New/Desktop/sber/mvp/backend')

from services.ai.assistant import AssistantService

async def main():
    svc = AssistantService()
    msgs = [
        "покажи все документы за 2026 год",
        "покажи все документы за март 2026",
        "сбрось фильтры",
        "покажи документы",
    ]
    pages = ["/", "/other", "/statement"]
    for page in pages:
        print(f"\n=== page_route = {page} ===")
        for m in msgs:
            r = await svc.process(
                message=m,
                session_id="debug-1",
                user_id="debug-user",
                page_route=page,
                org_id="demo",
            )
            print(f"Q: {m!r}")
            print(f"A: {(r.message or '')[:120]!r}")
            if r.ui_actions:
                for a in r.ui_actions:
                    print(f"  ui: {a.type} {a.target} value={a.value!r}")
            if r.navigation_path:
                for s in r.navigation_path:
                    print(f"  nav: {s.url}")

asyncio.run(main())
