#!/usr/bin/env python3
"""Картинки из самих исследований — блоки {"type": "image"} в content/research.

Нужны PyMuPDF и Pillow: pip install pymupdf pillow

  python3 scripts/research-figures.py list <ссылка или путь к PDF>
      Для агента: достаёт из PDF все картинки (рисунки, схемы, фото) и
      собирает их на один лист /tmp/research-figures.png с подписями
      «стр. N · #k» — посмотри его глазами (Read) и выбери. Печатает готовые
      блоки {"type": "image", "pdf": {...}} с подписью «Figure …» со страницы.

  python3 scripts/research-figures.py fetch
      Для GitHub Action: у всех блоков image без скачанного файла берёт
      картинку (url — прямая ссылка на файл, pdf — страница и номер картинки),
      сохраняет её в public/research/figures/*.webp и прописывает src и size.
"""

import hashlib
import io
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RESEARCH = ROOT / "content" / "research"
FIG_DIR = ROOT / "public" / "research" / "figures"
UA = "alex-friends-research-figures/1.0 (https://alex-friends.vercel.app)"
MIN_SIDE = 250  # мельче — логотипы и значки, не рисунки
MAX_WIDTH = 1600

_cache: dict[str, bytes] = {}


def download(url: str) -> bytes:
    if url in _cache:
        return _cache[url]
    if not re.match(r"^https?://", url):
        data = Path(url).read_bytes()
    else:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
        except urllib.error.URLError:
            # Python без системных сертификатов (сборка с python.org на macOS) —
            # качаем через curl, у него свои.
            data = subprocess.run(
                ["curl", "-sSL", "--fail", "-A", UA, url], check=True, capture_output=True, timeout=120
            ).stdout
    _cache[url] = data
    return data


def pdf_images(doc: fitz.Document, page_no: int):
    """Картинки страницы в порядке появления: (index, xref, ширина, высота)."""
    page = doc[page_no - 1]
    out = []
    for k, info in enumerate(page.get_images(full=True), start=1):
        xref, w, h = info[0], info[2], info[3]
        if min(w, h) >= MIN_SIDE:
            out.append((k, xref, w, h))
    return out


def extract(doc: fitz.Document, xref: int) -> Image.Image:
    pix = fitz.Pixmap(doc, xref)
    if pix.n - pix.alpha >= 4:  # CMYK → RGB
        pix = fitz.Pixmap(fitz.csRGB, pix)
    return flatten(Image.open(io.BytesIO(pix.tobytes("png"))))


def flatten(img: Image.Image) -> Image.Image:
    """Прозрачные картинки — на белую подложку, иначе прозрачное станет чёрным."""
    rgba = img.convert("RGBA")
    bg = Image.new("RGB", rgba.size, (255, 255, 255))
    bg.paste(rgba, mask=rgba.split()[3])
    return bg


def captions(page: fitz.Page) -> list[str]:
    text = page.get_text()
    found = re.findall(r"((?:Figure|Fig\.|Рис\.|Рисунок)\s*\d+[.:][^\n]*(?:\n[^\n]+)?)", text)
    return [re.sub(r"\s+", " ", c).strip()[:160] for c in found]


def cmd_list(src: str) -> None:
    doc = fitz.open(stream=download(src), filetype="pdf")
    tiles = []
    for p in range(1, doc.page_count + 1):
        caps = captions(doc[p - 1])
        for k, xref, w, h in pdf_images(doc, p):
            tiles.append((p, k, extract(doc, xref), w, h, caps))
    if not tiles:
        print("Картинок крупнее %dpx в PDF не нашлось." % MIN_SIDE)
        return

    # Лист превью: 4 в ряд, подпись «стр. N · #k» в углу.
    cw, ch, cols = 300, 230, 4
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cw * cols, ch * rows), (221, 221, 221))
    draw = ImageDraw.Draw(sheet)
    for i, (p, k, img, w, h, caps) in enumerate(tiles):
        im = img.copy()
        im.thumbnail((cw - 8, ch - 30))
        x, y = (i % cols) * cw + 4, (i // cols) * ch + 26
        sheet.paste(im, (x, y))
        draw.rectangle([x, y - 22, x + 70, y - 2], fill=(17, 17, 17))
        draw.text((x + 6, y - 18), f"p{p} #{k}", fill=(255, 255, 255))
    out = "/tmp/research-figures.png"
    sheet.save(out)

    for p, k, img, w, h, caps in tiles:
        block = {"type": "image", "pdf": {"url": src, "page": p, "index": k}, "caption": "", "source": ""}
        print(f"стр. {p} · #{k} — {w}×{h}")
        for c in caps:
            print(f"   подпись на странице: {c}")
        print("   " + json.dumps(block, ensure_ascii=False))
    print(f"\nЛист превью: {out}")


def fetch_block(b: dict, slug: str, n: int) -> bool:
    if b.get("src") and (ROOT / "public" / b["src"].lstrip("/")).exists():
        return False
    if b.get("pdf"):
        ref = b["pdf"]
        doc = fitz.open(stream=download(ref["url"]), filetype="pdf")
        found = [t for t in pdf_images(doc, int(ref["page"])) if t[0] == int(ref["index"])]
        if not found:
            raise RuntimeError(f"{slug}: на стр. {ref['page']} нет картинки #{ref['index']}")
        img = extract(doc, found[0][1])
    elif b.get("url"):
        img = flatten(Image.open(io.BytesIO(download(b["url"]))))
    else:
        return False
    if img.width > MAX_WIDTH:
        img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=88)
    data = buf.getvalue()
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{slug}-{n}-{hashlib.sha1(data).hexdigest()[:8]}.webp"
    (FIG_DIR / name).write_bytes(data)
    b["src"] = f"/research/figures/{name}"
    b["size"] = [img.width, img.height]
    return True


def cmd_fetch() -> None:
    failed = False
    for path in sorted(RESEARCH.glob("*.json")):
        r = json.loads(path.read_text("utf8"))
        changed = False
        n = 0
        for b in r.get("blocks", []):
            if b.get("type") != "image":
                continue
            n += 1
            try:
                if fetch_block(b, r["slug"], n):
                    changed = True
                    print(f"Картинка {r['slug']} #{n}: {b['src']}")
            except Exception as e:  # одна битая ссылка не должна валить остальное
                failed = True
                print(f"  ! {r['slug']} #{n}: {e}")
        if changed:
            path.write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", "utf8")
    if failed:
        print("Часть картинок не скачалась — блоки без src на сайте просто не показываются.")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "list":
        cmd_list(sys.argv[2])
    elif len(sys.argv) >= 2 and sys.argv[1] == "fetch":
        cmd_fetch()
    else:
        print(__doc__)
        sys.exit(1)
