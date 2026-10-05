// Превью исследований: npm run research:cover [slug]
// Для каждого исследования без обложки рисует картинку по его coverPrompt в
// едином стиле раздела, кладёт в public/research/<slug>.webp и прописывает
// cover/coverSize в JSON.
//
// Чем рисуем — бесплатно, Cloudflare Workers AI (FLUX.1 schnell, бесплатный
// лимит 10 000 «нейронов» в день — это десятки картинок, нам нужна одна):
// нужны CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_API_TOKEN. Если вместо них задан
// OPENAI_API_KEY — рисует OpenAI gpt-image (платно, но чуть лучше).

import "./load-env";
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
  "Isometric pixel art illustration with a soft matte finish: diffused even lighting, " +
  "no glossy highlights, gentle dithering, crisp pixel edges, muted pastel palette with " +
  "indigo and warm accents, plain soft neutral background, small cozy diorama composition, " +
  "centered, generous empty space around. Absolutely no text, letters, numbers or logos. Scene: ";

async function generateCloudflare(prompt: string): Promise<Buffer> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CF_MODEL}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
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
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

async function main() {
  const only = process.argv[2];
  fs.mkdirSync(IMG_DIR, { recursive: true });
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
    const p = path.join(DIR, file);
    const r: Research = JSON.parse(fs.readFileSync(p, "utf8"));
    if (only ? r.slug !== only : r.cover) continue;

    console.log(`Рисую превью: ${r.slug}`);
    const out = await sharp(await generate(r.coverPrompt))
      // Превью в разделе 3:2: квадрат Cloudflare обрезается по центру.
      .resize({ width: 1500, height: 1000, fit: "cover", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    fs.writeFileSync(path.join(IMG_DIR, `${r.slug}.webp`), out);
    const meta = await sharp(out).metadata();
    r.cover = `/research/${r.slug}.webp`;
    r.coverSize = [meta.width ?? 0, meta.height ?? 0];
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
