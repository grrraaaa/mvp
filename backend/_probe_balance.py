"""Quick E2E probe for the new balance workflow — run from backend/."""
import sys, os, asyncio, json

sys.path.insert(0, os.path.dirname(__file__))

from db.database import init_db, AsyncSessionLocal
from services.banking.queries import get_balance_data, is_balance_query, handle_banking_query


async def main():
    await init_db()
    async with AsyncSessionLocal() as s:
        data = await get_balance_data(s, "demo", history_months=6)
        print("=== get_balance_data (demo) ===")
        print(json.dumps(data, ensure_ascii=False, indent=2))
        print()

        print("is_balance_query('Сколько на счёте?'):", is_balance_query("Сколько на счёте?"))
        result = await handle_banking_query(s, "Сколько на счёте?")
        print()
        print("=== handle_banking_query('Сколько на счёте?') ===")
        print("message (head):", result["message"][:300])
        print()

        cp = result["chart_payload"]
        d = cp["data"]
        print("chart_payload.type:", cp["type"])
        print(f"chart_payload.data totals: BYN={d['total_byn']:.2f} USD={d['total_usd']:.2f} "
              f"EUR={d['total_eur']:.2f} RUB={d['total_rub']:.2f}")
        print("chart_payload.accounts count:", len(d["accounts"]))
        for a in d["accounts"]:
            print(f"  - {a['iban'][-8:]} {a['currency']} {a['balance']:.2f} ({a['label'] or a['account_type']})")
        print("chart_payload.history:")
        for h in d["history"]:
            print(f"  - {h['month']} {h['label']}: net={h['amount']:+.2f} (d={h['debit']:.2f} c={h['credit']:.2f})")
        print()
        print("bar chart:", cp["bar"]["title"], cp["bar"]["labels"], cp["bar"]["values"])
        print("line chart:", cp["line"]["title"], cp["line"]["labels"], cp["line"]["values"])
        print()
        print("charts count:", len(result["charts"]))
        for c in result["charts"]:
            print("  -", c["type"], c["title"])
        print()
        print("action_buttons:", [b["label"] for b in result["action_buttons"]])
        print("sources:", [s["label"] for s in result.get("sources", [])])


if __name__ == "__main__":
    asyncio.run(main())
