// Превью исследований без нейросетей: пиксельный спрайт (маленькая сетка
// символов + палитра), выдавленный в объём кубиками — как на доске-референсе
// «8 бит». Вокруг спрайта автоматически добавляется чёрная обводка, у каждого
// кубика три видимые грани (лицевая, верх, бок) с разным светом, под
// предметом — мягкая тень, фон — матовый цвет темы. Рендер детерминированный
// и бесплатный: никаких внешних сервисов и лимитов.

import sharp from "sharp";

export type Sprite = {
  /** Строки одинаковой длины; «.» — пусто, остальные символы — ключи палитры. */
  rows: string[];
  /** Символ → цвет #rrggbb. «k» можно не задавать — это чёрный. */
  palette: Record<string, string>;
};

const OUTLINE = "#1c1b1f";
const DEPTH = 3; // сколько кубиков в глубину
const SHIFT = 0.5; // смещение каждого слоя глубины, в долях кубика

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function shade(hex: string, k: number): string {
  // k > 0 — светлее (к белому), k < 0 — темнее (к чёрному).
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Спрайт + обводка: пустые клетки рядом с заполненными (включая диагонали) → «k». */
function withOutline(rows: string[]): string[][] {
  const h = rows.length + 2;
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  const grid = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => rows[y - 1]?.[x - 1] ?? ".")
  );
  const filled = (x: number, y: number) => grid[y]?.[x] !== undefined && grid[y][x] !== ".";
  const out = grid.map((row) => [...row]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (filled(x, y)) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (filled(x + dx, y + dy)) out[y][x] = "k";
        }
      }
    }
  }
  return out;
}

export async function renderVoxelCover(
  sprite: Sprite,
  background: string,
  width = 1024,
  height = 684
): Promise<Buffer> {
  const grid = withOutline(sprite.rows);
  const gh = grid.length;
  const gw = grid[0].length;
  const colorOf = (ch: string) => (ch === "k" ? sprite.palette.k ?? OUTLINE : sprite.palette[ch]);
  const filled = (x: number, y: number) => grid[y]?.[x] !== undefined && grid[y][x] !== ".";

  // Размер кубика — чтобы предмет занимал ~60% ширины и ~68% высоты кадра.
  const spanW = gw + DEPTH * SHIFT;
  const spanH = gh + DEPTH * SHIFT;
  const s = Math.min((width * 0.6) / spanW, (height * 0.68) / spanH);
  const ox = s * SHIFT; // слой глубины уходит вправо-вверх
  const oy = -s * SHIFT;
  const x0 = (width - spanW * s) / 2;
  const y0 = (height - spanH * s) / 2 + DEPTH * SHIFT * s;

  const poly = (pts: [number, number][], fill: string, edge: string) =>
    `<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}" ` +
    `fill="${fill}" stroke="${edge}" stroke-width="${Math.max(1, s * 0.06).toFixed(2)}" stroke-linejoin="round"/>`;

  const faces: string[] = [];
  // Слои от дальнего к ближнему; внутри — снизу вверх и слева направо, чтобы
  // ближние кубики перекрывали дальние. Рисуем только открытые грани.
  for (let d = DEPTH - 1; d >= 0; d--) {
    for (let y = gh - 1; y >= 0; y--) {
      for (let x = 0; x < gw; x++) {
        if (!filled(x, y)) continue;
        const base = colorOf(grid[y][x]);
        const px = x0 + x * s + d * ox;
        const py = y0 + y * s + d * oy;
        const edge = shade(base, -0.35);
        if (!filled(x, y - 1)) {
          faces.push(poly([[px, py], [px + s, py], [px + s + ox, py + oy], [px + ox, py + oy]], shade(base, 0.22), edge));
        }
        if (!filled(x + 1, y)) {
          faces.push(poly([[px + s, py], [px + s + ox, py + oy], [px + s + ox, py + s + oy], [px + s, py + s]], shade(base, -0.3), edge));
        }
        if (d === 0) {
          faces.push(poly([[px, py], [px + s, py], [px + s, py + s], [px, py + s]], shade(base, 0), edge));
        }
      }
    }
  }

  // Мягкая тень под предметом.
  let bottom = 0;
  let left = gw;
  let right = 0;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!filled(x, y)) continue;
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  const cx = x0 + ((left + right + 1) / 2) * s + (DEPTH * ox) / 2;
  const cy = y0 + (bottom + 1) * s + s * 0.9;
  const rx = ((right - left + 1) * s) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><filter id="blur"><feGaussianBlur stdDeviation="${(s * 0.9).toFixed(1)}"/></filter></defs>
  <rect width="100%" height="100%" fill="${background}"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${s * 0.9}" fill="#000" opacity="0.22" filter="url(#blur)"/>
  ${faces.join("\n  ")}
</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 92 }).toBuffer();
}
