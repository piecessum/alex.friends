// Синхронизация сохранённых пинов Pinterest: npm run sync:pins
// Пишет content/pins.json (см. lib/pinterest.ts). Если ничего не изменилось —
// файл не трогает, чтобы не плодить коммиты и деплои.
//
// Одну картинку можно сохранить в несколько досок — это разные пины, а часто
// и разные файлы на CDN (если сохранял из разных источников). На сайте такая
// картинка должна быть один раз, поэтому дубли выкидываем по «отпечатку»:
// хэш формы (dHash 8×8 по ч/б превью) + цвет по сетке 4×4. Цвет нужен, чтобы
// не склеивать одинаковые макеты в разных цветах. Отпечатки кэшируются в
// content/pin-fingerprints.json — считаются только для новых картинок.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fetchAllPins, pinSrc, type Pin } from "@/lib/pinterest";

const FILE = path.join(process.cwd(), "content", "pins.json");
const FP_FILE = path.join(process.cwd(), "content", "pin-fingerprints.json");

// Пороги подобраны на реальных дублях: у них расстояние хэшей ≤ 4 бит, а
// разница цвета в худшей клетке ≤ 13; у цветовых вариантов одного макета — 34+.
const MAX_HASH_DIST = 4;
const MAX_COLOR_DIFF = 25;
const MAX_RATIO_DIFF = 0.05;

type Fingerprint = { hash: bigint; grid: number[] };

async function fingerprint(pin: Pin): Promise<string> {
  const res = await fetch(pinSrc(pin, 236));
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const gray = await sharp(buf).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  // BigInt(…) вместо литералов 0n/1n — tsconfig таргетит ниже ES2020.
  const ZERO = BigInt(0), ONE = BigInt(1);
  let hash = ZERO;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      hash = (hash << ONE) | (gray[y * 9 + x] > gray[y * 9 + x + 1] ? ONE : ZERO);
    }
  }
  const grid = await sharp(buf).resize(4, 4, { fit: "fill" }).removeAlpha().raw().toBuffer();
  return `${hash.toString(16).padStart(16, "0")}:${grid.toString("hex")}`;
}

function parse(fp: string): Fingerprint {
  const [h, g] = fp.split(":");
  return { hash: BigInt(`0x${h}`), grid: [...Buffer.from(g, "hex")] };
}

function bits(x: bigint): number {
  let n = 0;
  for (const one = BigInt(1); x; x &= x - one) n++;
  return n;
}

function isDuplicate(a: Pin, fa: Fingerprint, b: Pin, fb: Fingerprint): boolean {
  if (Math.abs(a.h / a.w - b.h / b.w) > MAX_RATIO_DIFF) return false;
  if (bits(fa.hash ^ fb.hash) > MAX_HASH_DIST) return false;
  for (let i = 0; i < fa.grid.length; i++) {
    if (Math.abs(fa.grid[i] - fb.grid[i]) > MAX_COLOR_DIFF) return false;
  }
  return true;
}

async function loadFingerprints(pins: Pin[]): Promise<Map<string, Fingerprint>> {
  const cache: Record<string, string> = fs.existsSync(FP_FILE)
    ? JSON.parse(fs.readFileSync(FP_FILE, "utf8"))
    : {};
  const missing = [...new Set(pins.map((p) => p.img))].filter((img) => !cache[img]);
  if (missing.length) console.log(`Отпечатков считаю: ${missing.length}`);

  const byImg = new Map(pins.map((p) => [p.img, p]));
  let next = 0;
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (next < missing.length) {
        const img = missing[next++];
        try {
          cache[img] = await fingerprint(byImg.get(img)!);
        } catch (e) {
          console.warn(`  ! отпечаток ${img}: ${e}`);
        }
      }
    })
  );

  // В кэше — только картинки, которые ещё есть среди пинов.
  const used = new Set(pins.map((p) => p.img));
  const clean = Object.fromEntries(
    Object.entries(cache)
      .filter(([img]) => used.has(img))
      .sort(([a], [b]) => a.localeCompare(b))
  );
  const next_ = JSON.stringify(clean, null, 0) + "\n";
  const prev = fs.existsSync(FP_FILE) ? fs.readFileSync(FP_FILE, "utf8") : "";
  if (next_ !== prev) fs.writeFileSync(FP_FILE, next_);

  return new Map(Object.entries(clean).map(([img, fp]) => [img, parse(fp)]));
}

/** Оставляет первое (самое свежее) сохранение каждой картинки. */
function dedupe(pins: Pin[], fps: Map<string, Fingerprint>): Pin[] {
  const kept: { pin: Pin; fp?: Fingerprint }[] = [];
  const seenImg = new Set<string>();
  for (const pin of pins) {
    if (seenImg.has(pin.img)) continue; // тот же файл — дубль без вопросов
    const fp = fps.get(pin.img);
    if (fp && kept.some((k) => k.fp && isDuplicate(pin, fp, k.pin, k.fp))) continue;
    seenImg.add(pin.img);
    kept.push({ pin, fp });
  }
  return kept.map((k) => k.pin);
}

async function main() {
  const all = await fetchAllPins();
  if (all.length === 0) throw new Error("Pinterest не вернул ни одного пина — файл не трогаю");
  const pins = dedupe(all, await loadFingerprints(all));
  console.log(`Пинов: ${all.length}, без дублей: ${pins.length}`);

  const next = JSON.stringify(pins) + "\n";
  const prev = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8") : "";
  if (next === prev) {
    console.log("Пины не изменились — файл не трогаю.");
    return;
  }
  fs.writeFileSync(FILE, next);
  console.log(`Готово: ${FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
