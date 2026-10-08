// Превью исследований: npm run research:cover [slug,slug — перерисовать]
//
// Стиль — газетный коллаж (lib/collage-cover.ts): нейросеть рисует только
// объект-метафору статьи (coverPrompt) как ч/б фото на белом фоне, а
// растр точками, вырезку, матовый фон цвета темы, плашку и рваную бумагу
// делает код — поэтому стиль стабилен от картинки к картинке.
//
// Нейросеть — Cloudflare Workers AI (Lucid Origin, запасная FLUX schnell),
// бесплатно в пределах 10 000 «нейронов» в день. Нужны CLOUDFLARE_ACCOUNT_ID и
// CLOUDFLARE_API_TOKEN (запасной вариант — OPENAI_API_KEY).
//
// Если нейросеть недоступна (лимит, сбой), исследование без превью вовсе
// получает временное превью кубиками из coverSprite (lib/voxel-cover.ts) —
// пост не останется без картинки, а коллаж дорисуется при следующем запуске.

import "./load-env";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { renderCollageCover } from "@/lib/collage-cover";
import { renderVoxelCover } from "@/lib/voxel-cover";
import { COVER_STYLE, TOPIC_ACCENTS, TOPIC_COLORS, type Research } from "@/lib/research";

const DIR = path.join(process.cwd(), "content", "research");
const IMG_DIR = path.join(process.cwd(), "public", "research");
const W = 1024;
const H = 684;

// Меняешь стиль (промпт, обработку) — подними версию: все превью
// перерисуются сами, а посты в канале обновятся (см. research-publish).
const FALLBACK_STYLE = "voxel-fallback";

// Объект рисует Leonardo Lucid Origin — точнее следует промпту (~2 000
// «нейронов» за картинку 768×768: на пост в день хватает). Кончился лимит —
// запасная FLUX schnell (~100 нейронов, но путает предметы чаще).
const CF_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/leonardo/lucid-origin";
const CF_FALLBACK = "@cf/black-forest-labs/flux-1-schnell";
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

// Что просим у модели: один объект, ч/б, на белом — дальше всё делает код.
const SUBJECT =
  "Black and white studio product photograph of one clearly recognizable object, the whole " +
  "object fully in frame and centered, sharp focus, even soft lighting with clear midtones, " +
  "on a seamless pure white background, no shadows on the background, nothing else in the " +
  "frame, no text, no letters, no logos, no human faces. Hands are allowed. The object: ";

// Секреты часто вставляют с переносом строки или вместе со словом «Bearer».
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^Bearer\s+/i, "").trim();

async function generateCloudflare(prompt: string, model = CF_MODEL): Promise<Buffer> {
  const account = clean(process.env.CLOUDFLARE_ACCOUNT_ID);
  const token = clean(process.env.CLOUDFLARE_API_TOKEN);
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(
        model.includes("leonardo") ? { prompt, width: 768, height: 768 } : { prompt, steps: 8 }
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
    headers: { "content-type": "application/json", authorization: `Bearer ${clean(process.env.OPENAI_API_KEY)}` },
    body: JSON.stringify({ model: OPENAI_MODEL, prompt, size: "1024x1024", quality: "medium", n: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${data?.error?.message ?? ""}`);
  return Buffer.from(data.data[0].b64_json, "base64");
}

async function generateSubject(scene: string): Promise<Buffer> {
  const prompt = SUBJECT + scene;
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    try {
      return await generateCloudflare(prompt);
    } catch (e) {
      if (CF_MODEL === CF_FALLBACK) throw e;
      console.warn(`  ! ${CF_MODEL}: ${String(e).slice(0, 120)} — пробую ${CF_FALLBACK}`);
      return generateCloudflare(prompt, CF_FALLBACK);
    }
  }
  if (process.env.OPENAI_API_KEY) return generateOpenAI(prompt);
  throw new Error("нет ключей нейросети (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN или OPENAI_API_KEY)");
}

// Сначала без превью вовсе, потом уже вышедшие в канал, потом остальные.
const rank = (r: Research) => (!r.cover ? 0 : r.telegram ? 1 : 2);

function save(p: string, r: Research, out: Buffer, style: string) {
  const name = `${r.slug}-${crypto.createHash("sha1").update(out).digest("hex").slice(0, 8)}.webp`;
  fs.writeFileSync(path.join(IMG_DIR, name), out);
  if (r.cover && r.cover !== `/research/${name}`) {
    fs.rmSync(path.join(process.cwd(), "public", r.cover), { force: true });
  }
  r.cover = `/research/${name}`;
  r.coverSize = [W, H];
  r.coverStyle = style;
  fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
}

async function main() {
  const only = process.argv[2]?.split(",").filter(Boolean);
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const items = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({ p: path.join(DIR, file), r: JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as Research }))
    .sort((a, b) => rank(a.r) - rank(b.r));

  let aiDown = false; // нейросеть отказала (лимит и т.п.) — больше не дёргаем
  for (const { p, r } of items) {
    if (only?.length ? !only.includes(r.slug) : r.cover && r.coverStyle === COVER_STYLE) continue;
    console.log(`Рисую превью: ${r.slug}`);

    if (r.coverPrompt && !aiDown) {
      try {
        const subject = await generateSubject(r.coverPrompt);
        const out = await renderCollageCover(subject, TOPIC_COLORS[r.topic], TOPIC_ACCENTS[r.topic], r.slug, W, H);
        save(p, r, out, COVER_STYLE);
        continue;
      } catch (e) {
        console.warn(`  ! ${r.slug}: нейросеть не нарисовала — ${String(e).slice(0, 200)}`);
        aiDown = true;
      }
    }
    // Временное превью — только если картинки нет совсем.
    if (!r.cover && r.coverSprite) {
      save(p, r, await renderVoxelCover(r.coverSprite, TOPIC_COLORS[r.topic], W, H), FALLBACK_STYLE);
      console.log(`  временное превью кубиками: ${r.slug}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
