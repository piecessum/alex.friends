// Превью исследований: npm run research:cover [slug,slug — перерисовать]
//
// Стиль — газетный коллаж (lib/collage-cover.ts): нужен только предмет по
// смыслу статьи, а растр печати, матовый фон цвета темы, плашку и рваную
// бумагу делает код — поэтому стиль стабилен от картинки к картинке.
//
// Откуда предмет:
// 1. Стоковое фото с Pexels по coverQuery (бесплатно, без указания авторства;
//    нужен PEXELS_API_KEY). Из выдачи берётся первый снимок, где после вырезки
//    предмет целиком в кадре и занимает разумную долю кадра.
// 2. Иначе — нейросеть рисует предмет по coverPrompt (см. ниже).
// В обоих случаях объект вырезает сегментатор (lib/cutout.ts), а не «по белому
// цвету» — поэтому белые и блестящие части предмета больше не пропадают.
//
// Вырезанный объект кэшируется в content/research/subjects/<slug>.png: при
// смене стиля превью перерисовываются из кэша. Новый объект ищется, только
// если поменялся coverQuery/coverPrompt (ключ — coverSubjectPrompt).
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
import sharp from "sharp";
import { renderCollageCover } from "@/lib/collage-cover";
import { cutout } from "@/lib/cutout";
import { renderVoxelCover } from "@/lib/voxel-cover";
import { COVER_STYLE, TOPIC_ACCENTS, TOPIC_COLORS, type Research } from "@/lib/research";

const DIR = path.join(process.cwd(), "content", "research");
const IMG_DIR = path.join(process.cwd(), "public", "research");
const SUBJECT_DIR = path.join(DIR, "subjects");
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

// Что просим у модели: один объект на белом — дальше всё делает код. Людей и
// руки запрещаем: пальцы нейросеть рисует криво.
const SUBJECT =
  "Beautiful studio product photograph of one clearly recognizable object, the entire object " +
  "fully visible with a generous white margin on all sides, centered, tack-sharp focus, soft " +
  "natural lighting, rich but slightly muted vintage colors, on a seamless pure white " +
  "background, no shadow on the background, nothing else in the frame, no text, no letters, " +
  "no logos, no people, no hands, no fingers, no body parts. The object: ";

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

// ---- сток (Pexels) ----------------------------------------------------------

type Credit = NonNullable<Research["coverCredit"]>;

/** Ищет на Pexels фото предмета и вырезает его. Берёт первый снимок, где
 *  предмет целиком в кадре и не крошечный/не во весь кадр. */
async function stockSubject(query: string): Promise<{ png: Buffer; credit: Credit }> {
  const key = clean(process.env.PEXELS_API_KEY);
  const tried = new Set<number>();
  // Сначала ищем «на белом фоне» — такие снимки вырезаются чище всего.
  for (const q of [`${query} isolated on white background`, query]) {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=15`,
      { headers: { authorization: key } }
    );
    if (!res.ok) throw new Error(`Pexels: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as {
      photos: { id: number; url: string; photographer: string; src: { large2x: string } }[];
    };
    for (const p of data.photos.slice(0, 8)) {
      if (tried.has(p.id)) continue;
      tried.add(p.id);
      const img = Buffer.from(await (await fetch(p.src.large2x)).arrayBuffer());
      const cut = await cutout(img);
      console.log(`  pexels ${p.id}: объект ${Math.round(cut.coverage * 100)}% кадра, касается краёв: ${cut.edges}`);
      if (cut.edges === 0 && cut.coverage > 0.06 && cut.coverage < 0.7) {
        return { png: cut.png, credit: { source: "Pexels", author: p.photographer, url: p.url } };
      }
    }
  }
  throw new Error(`на Pexels не нашлось подходящего фото: ${query}`);
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
    // Ключ кэша: откуда и по какому запросу взят предмет. Старые записи без
    // префикса — картинки нейросети по coverPrompt.
    const useStock = !!process.env.PEXELS_API_KEY && !!r.coverQuery;
    const want = useStock ? `stock:${r.coverQuery}` : `ai:${r.coverPrompt}`;
    const had = r.coverSubjectPrompt === r.coverPrompt ? `ai:${r.coverPrompt}` : r.coverSubjectPrompt;
    // Перерисовываем, если сменился стиль или предмет (новый запрос/промпт).
    const fresh = r.cover && r.coverStyle === COVER_STYLE && had === want;
    if (only?.length ? !only.includes(r.slug) : fresh) continue;
    console.log(`Рисую превью: ${r.slug}`);

    const cached = path.join(SUBJECT_DIR, `${r.slug}.png`);
    const haveSubject = had === want && fs.existsSync(cached);
    if ((useStock || r.coverPrompt) && (haveSubject || useStock || !aiDown)) {
      try {
        let subject: Buffer;
        if (haveSubject) {
          subject = fs.readFileSync(cached);
          // Кэш старого формата — сырое фото на белом: вырезаем сегментатором.
          if ((await sharp(subject).stats()).isOpaque) {
            subject = (await cutout(subject)).png;
            fs.writeFileSync(cached, subject);
          }
        } else if (useStock) {
          const found = await stockSubject(r.coverQuery!);
          subject = found.png;
          r.coverCredit = found.credit;
        } else {
          subject = (await cutout(await generateSubject(r.coverPrompt!))).png;
          delete r.coverCredit;
        }
        if (!haveSubject) {
          fs.mkdirSync(SUBJECT_DIR, { recursive: true });
          fs.writeFileSync(cached, subject);
          r.coverSubjectPrompt = want;
        }
        const out = await renderCollageCover(subject, TOPIC_COLORS[r.topic], TOPIC_ACCENTS[r.topic], r.slug, W, H);
        save(p, r, out, COVER_STYLE);
        continue;
      } catch (e) {
        console.warn(`  ! ${r.slug}: не получилось — ${String(e).slice(0, 200)}`);
        if (!useStock) aiDown = true;
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
