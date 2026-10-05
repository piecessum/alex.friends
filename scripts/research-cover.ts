// Превью исследований через OpenAI: npm run research:cover [slug]
// Для каждого исследования без обложки рисует картинку по его coverPrompt в
// едином стиле раздела, кладёт в public/research/<slug>.webp и прописывает
// cover/coverSize в JSON. Нужен OPENAI_API_KEY (локально — в .env.local).

import "./load-env";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Research } from "@/lib/research";

const DIR = path.join(process.cwd(), "content", "research");
const IMG_DIR = path.join(process.cwd(), "public", "research");
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

// Общий стиль всех превью — меняется здесь, а не в каждом исследовании.
const STYLE =
  "Isometric pixel art illustration with a soft matte finish: diffused even lighting, " +
  "no glossy highlights, gentle dithering, crisp pixel edges, muted pastel palette with " +
  "indigo and warm accents, plain soft neutral background, small cozy diorama composition, " +
  "centered, generous empty space around. Absolutely no text, letters, numbers or logos. Scene: ";

async function generate(prompt: string): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY не задан");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, prompt: STYLE + prompt, size: "1536x1024", quality: "medium", n: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${data?.error?.message ?? ""}`);
  return Buffer.from(data.data[0].b64_json, "base64");
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
      .resize({ width: 1500, withoutEnlargement: true })
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
