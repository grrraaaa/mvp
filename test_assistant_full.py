import asyncio
import sys
sys.path.insert(0, 'C:/Users/New/Desktop/sber/mvp/backend')

from services.ai.assistant import AssistantService

async def main():
    svc = AssistantService()
    msgs = [
        "документы на подпись",
        "открой документы на подписи",
        "покажи документы на подпись",
        "покажи все документы",
        "покажи все документы за 2026 год",
        "покажи все документы за март 2026",
        "документы за 2024",
        "документы за период с 01.01.2026 по 31.03.2026",
        "документы за квартал",
        "сбрось фильтры",
    ]
    for m in msgs:
        r = await svc.process(
            message=m,
            session_id="debug-1",
            user_id="debug-user",
            page_route="/other/documents",
            org_id="demo",
        )
        print(f"\nQ: {m!r}")
        print(f"A: {(r.message or '')[:200]!r}")
        if r.ui_actions:
            for a in r.ui_actions:
                print(f"  ui_action: {a.type} {a.target} value={a.value!r}")
        if r.navigation_path:
            for s in r.navigation_path:
                print(f"  nav: {s.url}")

asyncio.run(main())
