// Превью исследований: npm run research:cover [slug,slug — перерисовать]
// Для каждого исследования без обложки рисует картинку по его coverPrompt в
// едином стиле раздела, пикселизует (см. pixelate), кладёт в
// public/research/<slug>-<хэш>.webp и прописывает cover/coverSize в JSON.
// Хэш в имени — чтобы перерисованное превью не залипало в кэше браузера/CDN.
//
// Чем рисуем — бесплатно, Cloudflare Workers AI (FLUX.1 schnell, бесплатный
// лимит 10 000 «нейронов» в день — это десятки картинок, нам нужна одна):
// нужны CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_API_TOKEN. Если вместо них задан
// OPENAI_API_KEY — рисует OpenAI gpt-image (платно, но чуть лучше).

import "./load-env";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Research } from "@/lib/research";

const DIR = path.join(process.cwd(), "content", "research");
const IMG_DIR = path.join(process.cwd(), "public", "research");
const CF_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

// Общий стиль всех превью — меняется здесь, а не в каждом исследовании.
const STYLE =
  "Isometric 16-bit pixel art illustration with a soft matte finish: diffused even lighting, " +
  "no glossy highlights, gentle dithering, crisp pixel edges, muted pastel palette with " +
  "indigo and warm accents, plain soft neutral background, small cozy diorama composition, " +
  "centered, generous empty space around. Absolutely no text, letters, numbers or logos. Scene: ";

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

async function generateCloudflare(prompt: string): Promise<Buffer> {
  const account = clean(process.env.CLOUDFLARE_ACCOUNT_ID);
  const token = clean(process.env.CLOUDFLARE_API_TOKEN);
  checkSecret("CLOUDFLARE_ACCOUNT_ID", account, /^[0-9a-f]{32}$/);
  checkSecret("CLOUDFLARE_API_TOKEN", token, /^[A-Za-z0-9_-]{20,}$/);
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CF_MODEL}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      // schnell рисует квадрат 1024×1024; 8 шагов — максимум и лучшее качество.
      body: JSON.stringify({ prompt, steps: 8 }),
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

async function generate(scene: string): Promise<Buffer> {
  const prompt = STYLE + scene;
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    return generateCloudflare(prompt);
  }
  if (process.env.OPENAI_API_KEY) return generateOpenAI(prompt);
  throw new Error("Нет ключей: задай CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (бесплатно) или OPENAI_API_KEY");
}

// Превью 3:2. Пиксели делаем обработкой, а не надеждой на промпт: модель
// рисует гладкую изометрию, мы уменьшаем её в PX раз, сводим к ограниченной
// палитре и увеличиваем обратно без сглаживания — честные квадратные пиксели
// и «матовые» приглушённые цвета.
const W = 1024;
const H = 684;
const PX = 4;
const COLOURS = 48;

async function pixelate(input: Buffer): Promise<Buffer> {
  const base = await sharp(input).resize(W, H, { fit: "cover" }).toBuffer();
  const small = await sharp(base)
    .resize(W / PX, H / PX, { kernel: "lanczos3" })
    .png({ palette: true, colours: COLOURS, dither: 0.6 })
    .toBuffer();
  return sharp(small).resize(W, H, { kernel: "nearest" }).webp({ quality: 90 }).toBuffer();
}

async function main() {
  const only = process.argv[2]?.split(",").filter(Boolean);
  fs.mkdirSync(IMG_DIR, { recursive: true });
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
    const p = path.join(DIR, file);
    const r: Research = JSON.parse(fs.readFileSync(p, "utf8"));
    if (only?.length ? !only.includes(r.slug) : r.cover) continue;

    console.log(`Рисую превью: ${r.slug}`);
    const out = await pixelate(await generate(r.coverPrompt));
    const name = `${r.slug}-${crypto.createHash("sha1").update(out).digest("hex").slice(0, 8)}.webp`;
    fs.writeFileSync(path.join(IMG_DIR, name), out);
    // Старое превью этого исследования больше не нужно.
    if (r.cover && r.cover !== `/research/${name}`) {
      fs.rmSync(path.join(process.cwd(), "public", r.cover), { force: true });
    }
    r.cover = `/research/${name}`;
    r.coverSize = [W, H];
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
