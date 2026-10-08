// Превью исследований в стиле газетного коллажа: вырезанный объект в
// приглушённых цветах с полутоновым растром поверх (точки, как в печати), на
// матовом цветном фоне с зерном бумаги, плашкой и полоской рваной бумаги.
// Нейросеть рисует только сам объект (предметное фото на белом фоне) — вся
// «газетность» делается здесь, поэтому стиль стабилен.

import sharp from "sharp";

const PAPER = "#efe8da"; // цвет газетной бумаги для полосок
const INK = [28, 27, 31]; // цвет «краски» точек
const CELL = 4; // шаг растра, px — мелкий, чтобы предмет читался

/** Детерминированный ГПСЧ от строки — у каждого исследования своя композиция. */
function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/**
 * Объект с белого фона: маска заливкой от краёв по пикселям цвета фона
 * (медиана рамки), затем цветной растр — цвета приглушаются и чуть уходят в
 * бумагу, а поверх ложатся точки CELL×CELL: радиус по темноте, внутри точки
 * цвет затемняется, как краска. Предмет остаётся цветным и узнаваемым, а
 * фактура — печатной. Возвращает RGBA на прозрачном фоне.
 */
async function printCutout(input: Buffer, maxW: number, maxH: number): Promise<Buffer> {
  // Срезаем пустые поля (модель рисует предмет с разными отступами).
  const trimmed = await sharp(input).trim({ threshold: 28 }).toBuffer();
  const { data, info } = await sharp(trimmed)
    .resize(maxW, maxH, { fit: "inside" })
    .removeAlpha()
    .modulate({ saturation: 0.78 })
    .linear(1.12, -10)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const at = (p: number) => [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
  const lum = (p: number) => 0.299 * data[p * 3] + 0.587 * data[p * 3 + 1] + 0.114 * data[p * 3 + 2];

  // Цвет фона — медиана рамки по каждому каналу.
  const ring: number[] = [];
  for (let x = 0; x < w; x += 3) ring.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 3) ring.push(y * w, y * w + w - 1);
  const bgRgb = [0, 1, 2].map((c) => ring.map((p) => data[p * 3 + c]).sort((a, b) => a - b)[ring.length >> 1]);
  const isBg = (p: number) => {
    const [r, g, b] = at(p);
    return Math.abs(r - bgRgb[0]) + Math.abs(g - bgRgb[1]) + Math.abs(b - bgRgb[2]) < 40;
  };
  const bg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (p: number) => {
    if (!bg[p] && isBg(p)) { bg[p] = 1; queue[tail++] = p; }
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  // Убираем светлый ореол по краю вырезки.
  const halo: number[] = [];
  for (let p = 0; p < w * h; p++) {
    if (bg[p] || lum(p) < 225) continue;
    const x = p % w;
    if ((x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || bg[p - w] || bg[p + w]) halo.push(p);
  }
  for (const p of halo) bg[p] = 1;

  const out = Buffer.alloc(w * h * 4);
  const paper = rgb(PAPER);
  for (let cy = 0; cy < h; cy += CELL) {
    for (let cx = 0; cx < w; cx += CELL) {
      let sum = 0, n = 0;
      for (let y = cy; y < Math.min(cy + CELL, h); y++) {
        for (let x = cx; x < Math.min(cx + CELL, w); x++) {
          const p = y * w + x;
          if (!bg[p]) { sum += 255 - lum(p); n++; }
        }
      }
      if (!n) continue;
      const r = Math.sqrt(sum / n / 255) * CELL * 0.72;
      const mx = cx + CELL / 2, my = cy + CELL / 2;
      for (let y = cy; y < Math.min(cy + CELL, h); y++) {
        for (let x = cx; x < Math.min(cx + CELL, w); x++) {
          const p = y * w + x;
          if (bg[p]) continue;
          const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
          const ink = d < r ? 1 : d < r + 1 ? r + 1 - d : 0;
          const src = at(p);
          for (let c = 0; c < 3; c++) {
            const base = src[c] * 0.88 + paper[c] * 0.12; // чуть в бумагу
            const inked = base * 0.6 + INK[c] * 0.4; // краска точки
            out[p * 4 + c] = Math.round(base * (1 - ink) + inked * ink);
          }
          out[p * 4 + 3] = 255;
        }
      }
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** Зерно бумаги: шум ±amount поверх картинки. */
async function grain(input: Buffer, w: number, h: number, amount = 14): Promise<Buffer> {
  const { data } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rand = rng("grain");
  for (let i = 0; i < data.length; i += 3) {
    const n = (rand() - 0.5) * amount * 2;
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, data[i + c] + n));
  }
  return sharp(data, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

/** Полоска рваной бумаги — многоугольник с неровными длинными краями. */
function tornStrip(rand: () => number, x: number, y: number, len: number, thick: number, angle: number): string {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * len;
    top.push(`${t.toFixed(1)},${((rand() - 0.5) * 7).toFixed(1)}`);
    bottom.unshift(`${t.toFixed(1)},${(thick + (rand() - 0.5) * 7).toFixed(1)}`);
  }
  return `<polygon transform="translate(${x} ${y}) rotate(${angle})" points="${[...top, ...bottom].join(" ")}" fill="${PAPER}"/>`;
}

export async function renderCollageCover(
  subject: Buffer,
  background: string,
  accent: string,
  seed: string,
  width = 1024,
  height = 684
): Promise<Buffer> {
  const rand = rng(seed);

  // Фон: матовый цвет, крупная плашка (круг или прямоугольник) акцентного
  // цвета и одна-две полоски рваной бумаги — как вырезки на столе.
  const shapes: string[] = [];
  const cx = width * (0.46 + rand() * 0.08);
  const cy = height * (0.46 + rand() * 0.08);
  if (rand() < 0.6) {
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${height * (0.3 + rand() * 0.06)}" fill="${accent}"/>`);
  } else {
    const rw = width * 0.36, rh = height * 0.62;
    shapes.push(`<rect x="${cx - rw / 2}" y="${cy - rh / 2}" width="${rw}" height="${rh}" fill="${accent}" transform="rotate(${(rand() - 0.5) * 10} ${cx} ${cy})"/>`);
  }
  shapes.push(tornStrip(rand, width * (0.05 + rand() * 0.1), height * (0.72 + rand() * 0.12), width * 0.5, height * 0.07, -4 + rand() * 8));
  if (rand() < 0.5) {
    shapes.push(tornStrip(rand, width * (0.6 + rand() * 0.1), height * (0.1 + rand() * 0.1), width * 0.3, height * 0.05, -6 + rand() * 12));
  }
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${background}"/>${shapes.join("")}</svg>`;

  // Объект: крупно, по центру плашки, с лёгкой тенью вырезки.
  const cut = await printCutout(subject, Math.round(width * 0.64), Math.round(height * 0.82));
  const meta = await sharp(cut).metadata();
  const cw = meta.width ?? 0, ch = meta.height ?? 0;
  const left = Math.round(Math.min(Math.max(cx - cw / 2, 0), width - cw));
  const top = Math.round(Math.min(Math.max(cy - ch / 2, 0), height - ch));
  const shadow = await sharp(cut)
    .ensureAlpha()
    .linear([0, 0, 0, 0.35], [0, 0, 0, 0])
    .blur(6)
    .png()
    .toBuffer();

  const composed = await sharp(Buffer.from(bgSvg))
    .composite([
      { input: shadow, left: Math.min(left + 10, width - cw), top },
      { input: cut, left, top },
    ])
    .png()
    .toBuffer();
  return sharp(await grain(composed, width, height)).webp({ quality: 90 }).toBuffer();
}
