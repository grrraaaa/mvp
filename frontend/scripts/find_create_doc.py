import json
import re
from pathlib import Path

p = Path(
    r"C:\Users\New\.cursor\projects\c-Users-New-Desktop-sber"
    r"/agent-transcripts/91dbc9b9-051d-409b-8732-a790ef00ffd7"
    r"/91dbc9b9-051d-409b-8732-a790ef00ffd7.jsonl"
)

for line_no in [325, 348, 364]:
    for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        if i != line_no:
            continue
        text = json.loads(line)["message"]["content"][0]["text"]
        if text.startswith("<user_query>"):
            text = text[12:-14]
        print(f"line {line_no}")
        for m in re.finditer("Создать документ", text):
            ctx = text[max(0, m.start() - 200) : m.start() + 120]
            print(" ", ctx.replace("\n", " ")[:280])
        for m in re.finditer(r'name="[^"]*create[^"]*"', text, re.I):
            if m.start() < 500000:
                print(" create name:", m.group())
