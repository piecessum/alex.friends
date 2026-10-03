// Превью рабочих текстов для вкладки «для работы» на /notes/work:
// npm run sync:work
//
// 1. Статьи и кейсы на wiki.tridavinci.org (страница автора) — заголовок,
//    дата, рубрика, описание, обложка.
// 2. Кейсы с сайта-резюме — берутся прямо из соседней папки ../alex
//    (lib/cases-data.ts): заголовок, тег, краткое описание и, если есть,
//    скриншот «после» из галереи как обложка.
//
// Обложки сжимаются в public/work/*.webp. Результат — content/work-posts.json.
// Меняется редко, поэтому запускается вручную, а не по расписанию.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { WorkPost } from "@/lib/work-posts";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "content", "work-posts.json");
const IMG_DIR = path.join(ROOT, "public", "work");
const RESUME_DIR = path.join(ROOT, "..", "alex");

const TDV_ORIGIN = "https://wiki.tridavinci.org";
const TDV_AUTHOR = `${TDV_ORIGIN}/blog/author/aleksey-masyuta`;
const RESUME_URL = process.env.NEXT_PUBLIC_RESUME_URL ?? "https://alexmasuta.vercel.app";

const MONTHS: Record<string, number> = {
  января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6,
  июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12,
};

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** «15 февраля 2026 г.» → «2026-02-15». */
function parseRuDate(s: string): string | undefined {
  const m = s.match(/(\d{1,2})\s+([а-я]+)\s+(\d{4})/i);
  const month = m && MONTHS[m[2].toLowerCase()];
  if (!m || !month) return undefined;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

async function saveCover(
  name: string,
  input: Buffer
): Promise<{ cover: string; coverSize: [number, number] }> {
  const file = path.join(IMG_DIR, `${name}.webp`);
  const out = await sharp(input)
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  fs.writeFileSync(file, out);
  const meta = await sharp(out).metadata();
  return { cover: `/work/${name}.webp`, coverSize: [meta.width ?? 0, meta.height ?? 0] };
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function tridavinci(): Promise<WorkPost[]> {
  const res = await fetch(TDV_AUTHOR, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`tridavinci: ${res.status}`);
  const html = await res.text();

  const posts: WorkPost[] = [];
  const cardRe = /<a\b[^>]*href="(\/blog\/(?!author\/)[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const m of html.matchAll(cardRe)) {
    const [, href, body] = m;
    const title = body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1];
    if (!title) continue; // не карточка (навигация, хлебные крошки)
    const slug = href.split("/").pop()!;
    const time = body.match(/<time[^>]*>([\s\S]*?)<\/time>/)?.[1] ?? "";
    const kind = body.match(/<\/time>[\s\S]*?<span[^>]*><\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/)?.[1];
    // <p\b, а не <p — иначе ловится <path> из svg-иконок.
    const excerpt = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1];
    const img = body.match(/<img[^>]*src="([^"]+)"/)?.[1];

    const post: WorkPost = {
      id: `tdv-${slug}`,
      source: "tridavinci",
      href: `${TDV_ORIGIN}${href}`,
      title: decode(title),
      excerpt: excerpt ? decode(excerpt) : "",
      date: parseRuDate(decode(time)),
      tag: kind ? decode(kind) : undefined,
    };
    if (img) {
      try {
        Object.assign(post, await saveCover(`tdv-${slug}`, await fetchBuffer(new URL(img, TDV_ORIGIN).href)));
      } catch (e) {
        console.warn(`  ! обложка ${slug}: ${e}`);
      }
    }
    posts.push(post);
  }
  if (posts.length === 0) throw new Error("tridavinci: не нашёл ни одной карточки — поменялась вёрстка?");
  return posts;
}

/** Убирает markdown-ссылки [текст](url) → текст. */
const stripMd = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

async function resumeCases(): Promise<WorkPost[]> {
  const file = path.join(RESUME_DIR, "lib", "cases-data.ts");
  if (!fs.existsSync(file)) {
    console.warn(`  ! нет ${file} — кейсы с сайта-резюме пропущены`);
    return [];
  }
  const { casesData } = (await import(file)) as {
    casesData: {
      slug: string;
      tag: string;
      title: string;
      summary: string;
      gallery?: { after: string }[];
    }[];
  };

  const posts: WorkPost[] = [];
  for (const c of casesData) {
    const post: WorkPost = {
      id: `case-${c.slug}`,
      source: "resume",
      href: `${RESUME_URL}/cases/${c.slug}`,
      title: c.title,
      excerpt: stripMd(c.summary),
      tag: c.tag,
    };
    const shot = c.gallery?.[0]?.after;
    const shotFile = shot && path.join(RESUME_DIR, "public", shot);
    if (shotFile && fs.existsSync(shotFile)) {
      Object.assign(post, await saveCover(`case-${c.slug}`, fs.readFileSync(shotFile)));
    }
    posts.push(post);
  }
  return posts;
}

async function main() {
  fs.rmSync(IMG_DIR, { recursive: true, force: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });

  console.log("Кейсы с сайта-резюме…");
  const cases = await resumeCases();
  console.log(`  ${cases.length}`);
  console.log("Статьи на wiki.tridavinci.org…");
  const articles = await tridavinci();
  console.log(`  ${articles.length}`);

  // Кейсы с резюме — первыми (это главное для работодателя), дальше статьи
  // от новых к старым.
  articles.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  fs.writeFileSync(OUT, JSON.stringify([...cases, ...articles], null, 2) + "\n");
  console.log(`Готово: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
