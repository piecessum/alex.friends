// Превью исследований: npm run research:cover [slug,slug — перерисовать]
//
// Главный путь — пиксельный спрайт из JSON (coverSprite), выдавленный в
// кубики кодом (lib/voxel-cover.ts): бесплатно, без сети и лимитов. Если
// спрайта нет — запасной путь через нейросеть по coverPrompt (ниже).
// Для каждого исследования без обложки (или со старым стилем) рисует картинку по его coverPrompt в
// едином стиле раздела (воксельный пиксель-арт, см. STYLE), кладёт в
// public/research/<slug>-<хэш>.webp и прописывает cover/coverSize в JSON.
// Хэш в имени — чтобы перерисованное превью не залипало в кэше браузера/CDN.
//
// Чем рисуем — бесплатно, Cloudflare Workers AI (Leonardo Lucid Origin, бесплатный
// лимит 10 000 «нейронов» в день — это десятки картинок, нам нужна одна):
// нужны CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_API_TOKEN. Если вместо них задан
// OPENAI_API_KEY — рисует OpenAI gpt-image (платно, но чуть лучше).

import "./load-env";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { TOPIC_COLOR_NAMES, TOPIC_COLORS, type Research } from "@/lib/research";
import { renderVoxelCover } from "@/lib/voxel-cover";

const DIR = path.join(process.cwd(), "content", "research");
const IMG_DIR = path.join(process.cwd(), "public", "research");
const CF_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/leonardo/lucid-origin";
const FALLBACK_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

// Общий стиль всех превью — меняется здесь, а не в каждом исследовании.
// Референс — доска «8 бит» в Pinterest: один предмет, собранный из кубиков
// (8-битный спрайт, выдавленный в объём), с чёрной обводкой, яркие плоские
// цвета. Фон — матовый цвет темы (TOPIC_COLORS, тона с референса-кассет).
// Меняешь стиль (промпт, фон, обработку) — подними версию: все превью
// перерисуются сами, а посты в канале обновятся (см. research-publish).
const COVER_STYLE = "voxel-sprite-1";

const STYLE =
  "Voxel art render in MagicaVoxel style: a single low-resolution 8-bit pixel-art sprite " +
  "(about 20x20 pixels) extruded into 3D, built entirely from identical chunky cubes, the cube " +
  "grid clearly visible on every face, blocky stepped edges like Lego, a thick black voxel " +
  "outline around the silhouette, bright flat saturated colors with simple cel shading, soft " +
  "studio light, three-quarter isometric angle, large and centered, filling most of the frame, " +
  "on a plain solid flat matte {BG} background with no floor and no scenery, object colors " +
  "contrasting with the background. No smooth surfaces, no text, no letters, no numbers. The object: ";

// Секреты часто вставляют с переносом строки или вместе со словом «Bearer» —
// чистим, иначе fetch падает на невалидном заголовке.
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^Bearer\s+/i, "").trim();

/** Проверка формата секрета без вывода самого значения. */
function checkSecret(name: string, value: string, re: RegExp) {
  if (re.test(value)) return;
  const bad = [...new Set([...value].filter((c) => !/[A-Za-z0-9_-]/.test(c)))]
    .map((c) => (/\s/.test(c) ? "пробел/перенос" : /[^\x00-\x7f]/.test(c) ? "не-латиница" : c))
    .join(", ");
  throw new Error(
    `${name} выглядит неправильно: длина ${value.length}, лишние символы: ${bad || "нет"}. ` +
      `Вставь в секрет только само значение, без кавычек, «Bearer» и примеров кода.`
  );
}

async function generateCloudflare(prompt: string, model = CF_MODEL): Promise<Buffer> {
  const account = clean(process.env.CLOUDFLARE_ACCOUNT_ID);
  const token = clean(process.env.CLOUDFLARE_API_TOKEN);
  checkSecret("CLOUDFLARE_ACCOUNT_ID", account, /^[0-9a-f]{32}$/);
  checkSecret("CLOUDFLARE_API_TOKEN", token, /^[A-Za-z0-9_-]{20,}$/);
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      // FLUX schnell рисует квадрат 1024×1024 (8 шагов — максимум); модели
      // Leonardo умеют сразу в 3:2.
      body: JSON.stringify(
        model.includes("leonardo")
          // 768×512 и увеличение потом: Lucid тарифицируется за плитки 512×512,
          // в 1536×1024 картинка съедала ~3 800 «нейронов» из 10 000 бесплатных
          // в день. Воксели при увеличении не портятся.
          ? { prompt, width: 768, height: 512 }
          : { prompt, steps: 8 }
      ),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.result?.image) {
    throw new Error(`Cloudflare: ${res.status} ${JSON.stringify(data?.errors ?? data).slice(0, 300)}`);
  }
  return Buffer.from(data.result.image, "base64");
}

async function generateOpenAI(prompt: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${clean(process.env.OPENAI_API_KEY)}`,
    },
    body: JSON.stringify({ model: OPENAI_MODEL, prompt, size: "1536x1024", quality: "medium", n: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${data?.error?.message ?? ""}`);
  return Buffer.from(data.data[0].b64_json, "base64");
}

async function generate(scene: string, bg: string): Promise<Buffer> {
  const prompt = STYLE.replace("{BG}", bg) + scene;
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    try {
      return await generateCloudflare(prompt);
    } catch (e) {
      // Фильтр модели иногда ложно срабатывает на безобидный промпт — пробуем FLUX.
      console.warn(`  ! ${CF_MODEL}: ${e} — пробую FLUX`);
      return generateCloudflare(prompt, FALLBACK_MODEL);
    }
  }
  if (process.env.OPENAI_API_KEY) return generateOpenAI(prompt);
  throw new Error("Нет ключей: задай CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (бесплатно) или OPENAI_API_KEY");
}

// Превью 3:2 (см. toWide).
const W = 1024;
const H = 684;

/** Картинка модели → 3:2. Если модель уже рисует широко — просто подгоняем.
 *  Квадрат: чуть крупнее высоты превью (сверху/снизу срезается только пустой
 *  фон), а бока продолжаются краевыми пикселями — фон плавный, без швов. */
async function toWide(input: Buffer): Promise<Buffer> {
  const { width = 0, height = 1 } = await sharp(input).metadata();
  if (width / height > 1.3) {
    return sharp(input).resize(W, H, { fit: "cover" }).toBuffer();
  }
  const S = Math.round(H * 1.17);
  const side = Math.round((W - S) / 2);
  const square = await sharp(input)
    .resize(S, S, { fit: "cover" })
    .extract({ left: 0, top: Math.round((S - H) / 2), width: S, height: H })
    .toBuffer();
  return sharp(square)
    .extend({ left: side, right: W - S - side, top: 0, bottom: 0, extendWith: "copy" })
    .toBuffer();
}

/**
 * Выравнивает фон до точного цвета темы. Модель уже рисует на фоне этого
 * тона, но оттенок у неё «плавает» — фон заливкой от краёв находим по тону
 * (хроматичности, без учёта яркости), поэтому тени (тот же тон, темнее)
 * попадают в фон, а детали предмета другого тона — нет. Тени сохраняются:
 * цвет темы умножается на то, насколько пиксель темнее фона.
 */
async function recolorBackground(input: Buffer, hex: string): Promise<Buffer> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const target = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lum = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const chroma = (i: number) => {
    const sum = data[i] + data[i + 1] + data[i + 2] || 1;
    return [data[i] / sum, data[i + 1] / sum, data[i + 2] / sum];
  };

  // Цвет фона — медиана рамки картинки (по каждому каналу).
  const ring: number[] = [];
  for (let x = 0; x < w; x += 4) ring.push(x * 3, ((h - 1) * w + x) * 3);
  for (let y = 0; y < h; y += 4) ring.push(y * w * 3, (y * w + w - 1) * 3);
  const median = (arr: number[]) => arr.sort((a, b) => a - b)[arr.length >> 1];
  const bgRgb = [0, 1, 2].map((c) => median(ring.map((i) => data[i + c])));
  const bgLum = 0.299 * bgRgb[0] + 0.587 * bgRgb[1] + 0.114 * bgRgb[2] || 1;
  const bgSum = bgRgb[0] + bgRgb[1] + bgRgb[2] || 1;
  const bgChroma = bgRgb.map((v) => v / bgSum);

  const isBg = (p: number) => {
    const i = p * 3;
    const ratio = lum(i) / bgLum;
    if (ratio <= 0.3 || ratio >= 1.25) return false;
    const c = chroma(i);
    const dist = Math.abs(c[0] - bgChroma[0]) + Math.abs(c[1] - bgChroma[1]) + Math.abs(c[2] - bgChroma[2]);
    return dist < 0.06;
  };

  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (p: number) => {
    if (!seen[p] && isBg(p)) { seen[p] = 1; queue[tail++] = p; }
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

  const out = Buffer.from(data);
  for (let p = 0; p < w * h; p++) {
    if (!seen[p]) continue;
    const i = p * 3;
    const ratio = Math.min(lum(i) / bgLum, 1);
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(target[c] * ratio);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

async function render(input: Buffer, topicColor: string): Promise<Buffer> {
  const wide = await toWide(input);
  return sharp(await recolorBackground(wide, topicColor)).webp({ quality: 90 }).toBuffer();
}

const rank = (r: Research) => (!r.cover ? 0 : r.telegram ? 1 : 2);

async function main() {
  const only = process.argv[2]?.split(",").filter(Boolean);
  fs.mkdirSync(IMG_DIR, { recursive: true });
  let failed = 0;
  // Порядок: сначала без превью вовсе, потом уже вышедшие в канал, потом
  // остальные — если бесплатный лимит кончится на середине, важное успеет.
  const items = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({ p: path.join(DIR, file), r: JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as Research }))
    .sort((a, b) => rank(a.r) - rank(b.r));
  for (const { p, r } of items) {
    if (only?.length ? !only.includes(r.slug) : r.cover && r.coverStyle === COVER_STYLE) continue;

    console.log(`Рисую превью: ${r.slug}`);
    let out: Buffer;
    try {
      if (r.coverSprite) {
        // Главный путь: спрайт → кубики кодом. Бесплатно и без сети.
        out = await renderVoxelCover(r.coverSprite, TOPIC_COLORS[r.topic], W, H);
      } else {
        if (!r.coverPrompt) throw new Error("нет ни coverSprite, ни coverPrompt");
        const bg = `${TOPIC_COLOR_NAMES[r.topic]} (${TOPIC_COLORS[r.topic]})`;
        out = await render(await generate(r.coverPrompt, bg), TOPIC_COLORS[r.topic]);
      }
    } catch (e) {
      // Одно неудачное превью не должно ронять остальные; без превью пост
      // в канал не уйдёт и будет перерисован при следующем запуске.
      console.warn(`  ! ${r.slug}: превью не получилось — ${e}`);
      failed++;
      // Кончился дневной бесплатный лимит — остальные тоже не получатся.
      if (/429|daily free allocation/.test(String(e))) {
        console.warn("  ! лимит Cloudflare на сегодня исчерпан — остальное в следующий раз");
        break;
      }
      continue;
    }
    const name = `${r.slug}-${crypto.createHash("sha1").update(out).digest("hex").slice(0, 8)}.webp`;
    fs.writeFileSync(path.join(IMG_DIR, name), out);
    // Старое превью этого исследования больше не нужно.
    if (r.cover && r.cover !== `/research/${name}`) {
      fs.rmSync(path.join(process.cwd(), "public", r.cover), { force: true });
    }
    r.cover = `/research/${name}`;
    r.coverSize = [W, H];
    r.coverStyle = COVER_STYLE;
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
  }
  if (failed) console.warn(`Не получилось превью: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
