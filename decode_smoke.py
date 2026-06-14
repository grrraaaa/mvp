import json, sys
data = json.load(open(r'C:\Users\New\Desktop\sber\mvp\smoke_20260614_135345.json', encoding='utf-8-sig'))
ok = sum(1 for t in data if t['status'] == 'OK')
fail = sum(1 for t in data if t['status'] == 'FAIL')
print(f'=== Smoke 14.06.2026 13:53:45 ===')
print(f'Total: {len(data)}, OK: {ok}, FAIL: {fail}')
print()
for t in data:
    print(f'[{t["status"]}] {t["name"]}')
    if t.get('nav'):         print(f'   nav : {t["nav"]}')
    if t.get('buttons'):     print(f'   btn : {t["buttons"]}')
    if t.get('form_actions'):print(f'   form: {t["form_actions"]}')
    if t.get('sources'):     print(f'   src : {t["sources"]} hits')
    msg = t.get('message') or ''
    if msg:
        msg_short = msg[:200].replace('\n', ' / ')
        print(f'   msg : {msg_short}')
    print()
