import json, io, sys
data = json.load(open(r'C:\Users\New\Desktop\sber\mvp\smoke_20260618_170252.json', encoding='utf-8-sig'))
buf = io.StringIO()
buf.write('=' * 70 + '\n')
buf.write('WORKFLOW_DEMO.md SMOKE 18.06.2026 17:02:52\n')
buf.write('=' * 70 + '\n')
ok = sum(1 for t in data if t['status'] == 'OK')
fail = sum(1 for t in data if t['status'] == 'FAIL')
buf.write('Total: %d | OK: %d | FAIL: %d\n' % (len(data), ok, fail))
buf.write('\n')
for t in data:
    name = t['name']
    if t['status'] == 'FAIL':
        err = (t.get('error') or '')[:120]
        buf.write('[FAIL] %s: %s\n' % (name, err))
        continue
    msg = (t.get('message') or '').replace('\n', ' / ')[:220]
    nav = t.get('nav') or ''
    btn = t.get('buttons') or ''
    src = t.get('sources') or 0
    form = t.get('form_actions') or ''
    buf.write('[OK] %s\n' % name)
    if nav:  buf.write('  nav : %s\n' % nav)
    if btn:  buf.write('  btn : %s\n' % btn[:200])
    if form: buf.write('  form: %s\n' % form)
    if src:  buf.write('  src : %d hits\n' % src)
    buf.write('  msg : %s\n' % msg)
    buf.write('\n')

out_path = r'C:\Users\New\Desktop\sber\mvp\smoke_report.txt'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(buf.getvalue())
print('saved %s' % out_path, file=sys.stdout)
