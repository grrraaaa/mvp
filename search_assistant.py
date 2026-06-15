"""Find hardcoded data — lists of items, hardcoded routes, big dicts."""
import re
import sys

with open(r'C:\Users\New\Desktop\sber\mvp\backend\services\ai\assistant.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines()

# Look for hardcoded data structures
for i, line in enumerate(lines, 1):
    # big list with explicit items
    if re.search(r'^[\s]*(MOCK_|FAKE_|DEMO_|HARDCODED_)', line):
        sys.stdout.buffer.write(f"{i}: {line}\n".encode('utf-8'))
    # explicit fallback data
    if 'return [' in line and i < len(lines):
        # check if this is a long list of dicts
        next_few = '\n'.join(lines[i-1:i+10])
        if 'counterparty' in next_few or 'account' in next_few or 'document' in next_few:
            sys.stdout.buffer.write(f"--- {i} ---\n{next_few}\n----\n".encode('utf-8'))
