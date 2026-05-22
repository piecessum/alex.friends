#!/usr/bin/env python3
"""
Оптимизация картинок лонгридов: PNG/JPG из public/notes -> WebP с шириной до
1400px. Ссылки в content/notes/*.json и index.json переписываются автоматически.

Запуск (после import-telegraph.mjs):  python3 scripts/optimize-notes-images.py
"""
from PIL import Image
import glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public", "notes")
CONTENT = os.path.join(ROOT, "content", "notes")
MAX_W = 1400
QUALITY = 80

rename = {}  # старое имя файла -> новое
before = after = 0

for f in sorted(glob.glob(os.path.join(PUBLIC, "*"))):
    base = os.path.basename(f)
    if not base.lower().endswith((".png", ".jpg", ".jpeg")):
        continue
    before += os.path.getsize(f)
    im = Image.open(f)
    if im.mode in ("P", "LA"):
        im = im.convert("RGBA")
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    new_base = os.path.splitext(base)[0] + ".webp"
    im.save(os.path.join(PUBLIC, new_base), "WEBP", quality=QUALITY, method=6)
    os.remove(f)
    rename[base] = new_base
    after += os.path.getsize(os.path.join(PUBLIC, new_base))

# Переписываем ссылки во всех JSON
for jf in glob.glob(os.path.join(CONTENT, "*.json")):
    txt = open(jf, encoding="utf-8").read()
    for old, new in rename.items():
        txt = txt.replace(f"/notes/{old}", f"/notes/{new}")
    open(jf, "w", encoding="utf-8").write(txt)

print(f"Оптимизировано {len(rename)} картинок")
print(f"Было {before/1024/1024:.0f} МБ -> стало {after/1024/1024:.1f} МБ")
