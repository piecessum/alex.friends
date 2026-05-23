#!/usr/bin/env python3
"""
Импорт коллекции пластинок из Google-таблицы в content/vinyl.json.

Таблица: «Что у нас есть» (артист/альбом в колонке A, треки в B) и
«Что мы хотим» (колонка D). Сеть идёт через curl (за прокси fetch не работает).

Запуск:  python3 scripts/import-vinyl.py
"""
import csv, io, json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET_ID = "1-mKxRaLYPAaUwABJR-dWMaVMPdrYfwiEk4Hm7tJ6bGs"
URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv"

text = subprocess.run(["curl", "-sL", URL], capture_output=True, text=True).stdout
rows = list(csv.reader(io.StringIO(text)))

# col0 — артист/альбом, col1 — трек; новый альбом начинается там, где есть col0
have, cur = [], None
for r in rows[2:]:
    c0 = (r[0].strip() if len(r) > 0 else "")
    c1 = (r[1].strip() if len(r) > 1 else "")
    if c0:
        cur = {"title": c0, "tracks": []}
        have.append(cur)
    if c1 and cur is not None:
        cur["tracks"].append(c1)

# col3 — список «хочу»
want = [r[3].strip() for r in rows[2:] if len(r) > 3 and r[3].strip()]

out = {"have": have, "want": want}
os.makedirs(os.path.join(ROOT, "content"), exist_ok=True)
with open(os.path.join(ROOT, "content", "vinyl.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f"Готово: have={len(have)} альбомов, want={len(want)}")
