// Превью исследований в стиле газетного коллажа: вырезанный объект в
// приглушённых цветах с полутоновым растром поверх (точки, как в печати), на
// матовом цветном фоне с зерном бумаги, плашкой и полоской рваной бумаги.
// Нейросеть рисует только сам объект (предметное фото на белом фоне) — вся
// «газетность» делается здесь, поэтому стиль стабилен.

import sharp, { type OverlayOptions } from "sharp";

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
async function printCutout(input: Buffer, maxW: number, maxH: number, full = false): Promise<Buffer> {
  // Уже вырезанный объект (прозрачный фон от lib/cutout.ts) — маска из альфы.
  // full — фото целиком, без вырезки (растр ложится на весь кадр).
  // Иначе (старый путь) — фон ищем заливкой от краёв по цвету рамки.
  const isCutout = !full && !!(await sharp(input).metadata()).hasAlpha && !(await sharp(input).stats()).isOpaque;
  // Срезаем пустые поля (модель рисует предмет с разными отступами).
  const trimmed = full ? input : await sharp(input).trim(isCutout ? {} : { threshold: 28 }).toBuffer();
  const resized = sharp(trimmed).resize(maxW, maxH, { fit: "inside" });
  const alpha = isCutout
    ? (await resized.clone().ensureAlpha().extractChannel(3).raw().toBuffer())
    : null;
  const { data, info } = await resized
    .clone()
    .flatten({ background: "#ffffff" })
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
  if (full) {
    // фон не ищем — весь кадр это снимок
  } else if (alpha) {
    for (let p = 0; p < w * h; p++) bg[p] = alpha[p] < 128 ? 1 : 0;
  } else {
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
  }

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
          // У вырезки нейросетью края мягкие — сохраняем её альфу.
          out[p * 4 + 3] = alpha ? alpha[p] : 255;
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
  height = 684,
  { full = false }: { full?: boolean } = {}
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

  // Объект: крупно, по центру плашки, с лёгкой тенью вырезки. Фото целиком —
  // как вклеенный снимок: бумажная рамка и лёгкий поворот.
  let cut = await printCutout(
    subject,
    Math.round(width * (full ? 0.7 : 0.64)),
    Math.round(height * (full ? 0.72 : 0.82)),
    full
  );
  if (full) {
    const b = Math.round(width * 0.012);
    cut = await sharp(cut)
      .extend({ top: b, bottom: b, left: b, right: b, background: PAPER })
      .rotate((rand() - 0.5) * 5, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }
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

/**
 * Раскладки кучки снимков для 1–6 обложек: центр (доли холста) и ширина
 * снимка (доля ширины; высота снимка в долях высоты холста почти та же).
 * Первый — самый крупный, дальше всё мельче. Соседи заезжают друг на друга
 * краями, но у каждого видна большая часть.
 */
const PILES: [number, number, number][][] = [
  [[0.5, 0.5, 0.62]],
  [[0.37, 0.42, 0.52], [0.68, 0.62, 0.4]],
  [[0.33, 0.4, 0.5], [0.73, 0.33, 0.36], [0.6, 0.72, 0.32]],
  [[0.31, 0.39, 0.48], [0.73, 0.31, 0.37], [0.77, 0.7, 0.3], [0.44, 0.73, 0.28]],
  [[0.31, 0.39, 0.48], [0.73, 0.31, 0.37], [0.77, 0.69, 0.31], [0.47, 0.75, 0.27], [0.15, 0.76, 0.24]],
  [[0.3, 0.4, 0.47], [0.75, 0.31, 0.36], [0.79, 0.7, 0.3], [0.48, 0.76, 0.28], [0.16, 0.77, 0.24], [0.53, 0.2, 0.21]],
];

/**
 * Обложка дайджеста недели: обложки исследований недели как вклеенные снимки
 * с бумажной рамкой, небрежной кучкой на тёмном матовом фоне с зерном —
 * разного размера, повёрнутые, заезжают друг на друга. Крупные лежат снизу,
 * мелкие сверху, чтобы ни один не потерялся.
 */
export async function renderDigestCover(
  covers: Buffer[],
  seed: string,
  width = 1024,
  height = 684
): Promise<Buffer> {
  const rand = rng(seed);
  const list = covers.slice(0, PILES.length);
  const pile = PILES[list.length - 1];

  const layers: OverlayOptions[] = [];
  for (let i = 0; i < list.length; i++) {
    const [fx, fy, fw] = pile[i];
    const photoW = Math.round(width * fw * (0.95 + rand() * 0.1));
    const photoH = Math.round((photoW * 2) / 3);
    const border = Math.max(6, Math.round(photoW * 0.03));
    const framed = await sharp(list[i])
      .resize(photoW, photoH, { fit: "cover" })
      .extend({ top: border, bottom: border, left: border, right: border, background: PAPER })
      .png()
      .toBuffer();
    // Наклон ±4…11°, знак вперемешку — небрежно, но не вверх ногами.
    const angle = (rand() < 0.5 ? -1 : 1) * (4 + rand() * 7);
    const tilted = await sharp(framed)
      .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const m = await sharp(tilted).metadata();
    const tw = m.width ?? 0, th = m.height ?? 0;
    const cx = width * (fx + (rand() - 0.5) * 0.04);
    const cy = height * (fy + (rand() - 0.5) * 0.04);
    const left = Math.round(Math.min(Math.max(cx - tw / 2, 0), width - tw));
    const topPx = Math.round(Math.min(Math.max(cy - th / 2, 0), height - th));
    // Тень плотнее и шире: у наложенных снимков она отделяет верхний от нижнего.
    const shadow = await sharp(tilted).ensureAlpha().linear([0, 0, 0, 0.55], [0, 0, 0, 0]).blur(10).png().toBuffer();
    layers.push({ input: shadow, left: Math.min(left + 9, width - tw), top: Math.min(topPx + 10, height - th) });
    layers.push({ input: tilted, left, top: topPx });
  }
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#3a3440"/></svg>`;
  const composed = await sharp(Buffer.from(bg)).composite(layers).png().toBuffer();
  return sharp(await grain(composed, width, height, 10)).webp({ quality: 90 }).toBuffer();
}

/**
 * Картинка поста дайджеста в канале — как превью истории на сайте
 * (components/research-stories.tsx), только в формате обложек 3:2: матовый
 * фон цвета темы с зерном, круг-плашка и полоса газеты с крупным «#N».
 */
export async function renderDigestPoster(
  number: number,
  background: string,
  accent: string,
  seed: string,
  width = 1024,
  height = 684
): Promise<Buffer> {
  const rand = rng(seed);
  // Номер — в правом нижнем углу: обрывок газеты уходит за правый край,
  // круг-плашка и полоска скотча уравновешивают его слева сверху.
  const cx = width * (0.26 + rand() * 0.12);
  const tilt = -7 + rand() * 4;
  const stripH = height * 0.34;
  const stripX = width * 0.4;
  const stripY = height * 0.58;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${background}"/>
    <circle cx="${cx.toFixed(0)}" cy="${(height * 0.38).toFixed(0)}" r="${(height * 0.29).toFixed(0)}" fill="${accent}"/>
    ${tornStrip(rand, width * 0.07, height * 0.1, width * 0.26, 34, 6 + rand() * 8)}
    <g transform="rotate(${tilt.toFixed(1)} ${(stripX + width) / 2} ${stripY + stripH / 2})">
      ${tornStrip(rand, stripX, stripY, width - stripX + 60, stripH, 0)}
      <text x="${width - 64}" y="${(stripY + stripH * 0.82).toFixed(0)}" text-anchor="end" fill="#1c1b1f"
        font-family="'Times New Roman', Times, serif" font-weight="800" font-size="${(stripH * 0.95).toFixed(0)}" letter-spacing="-8"><tspan font-size="${(stripH * 0.58).toFixed(0)}" font-weight="400" fill-opacity="0.6" dy="${(-stripH * 0.3).toFixed(0)}">#</tspan><tspan dy="${(stripH * 0.3).toFixed(0)}">${number}</tspan></text>
    </g>
  </svg>`;
  const composed = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(await grain(composed, width, height)).webp({ quality: 90 }).toBuffer();
}
