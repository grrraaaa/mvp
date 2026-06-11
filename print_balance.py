import json
d = json.load(open('C:/Users/New/Desktop/sber/mvp/balance.json', 'r', encoding='utf-8'))
print('total_byn:', d.get('total_byn'))
print('history:')
for h in d.get('history', []):
    print(f"  {h['month']}: debit={h['debit']:.0f} credit={h['credit']:.0f}")
