// Синхронизация ленты канала в статику: npm run sync
//
// 1. Скрейпит t.me/s/ux_review (lib/telegram.ts) — все посты, склейки, эмодзи.
// 2. Посты в новой вёрстке Telegram, которые веб-превью не показывает,
//    дотягивает через бота (lib/telegram-rich.ts). Однажды полученные берутся
//    из прошлой версии ленты; SYNC_REFRESH_RICH — перезапросить (см. ниже).
// 3. Все картинки скачивает в public/channel/*.webp (до 1280px по ширине)
//    и запоминает их размеры — сайт отдаёт их статикой с CDN, без прокси.
// 4. Пишет content/channel-feed.json — единственный источник ленты для сайта.
//    Если изменились только просмотры — файл не трогаем, чтобы не плодить
//    коммиты и деплои (см. .github/workflows/sync-channel.yml).
//
// Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_OWNER_ID (локально — из .env.local).

import "./load-env";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fetchAllPosts, proxiedImage, type TgPost, type TgRichBlock } from "@/lib/telegram";
import { downloadTelegramFile, fetchRichPost } from "@/lib/telegram-rich";

const ROOT = process.cwd();
const FEED = path.join(ROOT, "content", "channel-feed.json");
const IMG_DIR = path.join(ROOT, "public", "channel");
const MAX_WIDTH = 1280;
// SYNC_REFRESH_RICH=1 — перезапросить все rich-посты, =851,864 — только эти.
const REFRESH_RICH = process.env.SYNC_REFRESH_RICH ?? "";
const refreshRich = (id: string) =>
  REFRESH_RICH === "1" || REFRESH_RICH.split(",").includes(id);

function readFeed(): TgPost[] {
  try {
    const data = JSON.parse(fs.readFileSync(FEED, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const used = new Set<string>(); // имена файлов, на которые ссылается лента

/** Сжимает картинку в webp и кладёт в public/channel. Возвращает src и размер. */
async function saveImage(
  name: string,
  load: () => Promise<Buffer>
): Promise<{ src: string; size: [number, number] }> {
  const file = path.join(IMG_DIR, `${name}.webp`);
  used.add(`${name}.webp`);
  if (!fs.existsSync(file)) {
    const out = await sharp(await load())
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    fs.writeFileSync(file, out);
  }
  const meta = await sharp(file).metadata();
  return { src: `/channel/${name}.webp`, size: [meta.width ?? 0, meta.height ?? 0] };
}

async function download(url: string): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url.startsWith("//") ? `https:${url}` : url, {
      headers: { "user-agent": "Mozilla/5.0" },
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (attempt >= 2 || res.status < 500) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
}

const hash = (s: string) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);

/**
 * Картинку из веб-превью (CDN telesco.pe) — в локальный webp. Имя файла —
 * хэш адреса без query: адреса стабильны между скрейпами, так что уже
 * скачанное не качается повторно. Если скачать не вышло — оставляем прокси.
 */
async function localize(
  url: string | undefined,
  sizes: Record<string, [number, number]>
): Promise<string | undefined> {
  if (!url || url.startsWith("/")) return url;
  try {
    const { src, size } = await saveImage(hash(url.split("?")[0]), () => download(url));
    sizes[src] = size;
    return src;
  } catch (e) {
    console.warn(`  ! картинка не скачалась, остаётся прокси: ${e}`);
    return proxiedImage(url);
  }
}

async function localizePost(p: TgPost): Promise<TgPost> {
  const sizes: Record<string, [number, number]> = {};
  const photos: string[] = [];
  for (const u of p.photos) photos.push((await localize(u, sizes))!);
  const videos = [];
  for (const v of p.videos) videos.push({ ...v, thumb: await localize(v.thumb, sizes) });
  const link = p.link ? { ...p.link, image: await localize(p.link.image, sizes) } : undefined;
  return {
    ...p,
    photos,
    videos,
    ...(link ? { link } : {}),
    ...(Object.keys(sizes).length ? { sizes: { ...p.sizes, ...sizes } } : {}),
  };
}

/** Пост в новой вёрстке: блоки из Bot API, картинки — в локальный webp. */
async function richPost(p: TgPost, prev: TgPost | undefined): Promise<TgPost> {
  if (prev?.rich && !refreshRich(p.id)) {
    // Уже забирали — берём блоки из прошлой ленты, картинки уже на диске.
    for (const b of prev.rich) if (b.type === "photo") used.add(path.basename(b.src));
    return {
      ...p,
      rich: prev.rich,
      html: prev.html,
      photos: prev.photos,
      tags: prev.tags,
      sizes: { ...p.sizes, ...prev.sizes },
      unsupported: undefined,
    };
  }

  console.log(`  rich ${p.id}: забираю через бота`);
  let draft = null;
  try {
    draft = await fetchRichPost(p.id);
  } catch (e) {
    console.warn(`  ! ${p.id}: ${e}`);
  }
  if (!draft) {
    // Показать нечего (служебное сообщение, запрет пересылки…). Запоминаем
    // пустой rich, чтобы не пересылать пост боту на каждой синхронизации.
    console.warn(`  ! ${p.id}: пусто — пост не попадёт в ленту`);
    return { ...p, rich: [], unsupported: undefined };
  }

  const sizes: Record<string, [number, number]> = {};
  const rich: TgRichBlock[] = [];
  let n = 0;
  for (const b of draft.blocks) {
    if (b.type === "text") {
      rich.push(b);
      continue;
    }
    const { src, size } = await saveImage(`${p.id}-r${n++}`, () => downloadTelegramFile(b.fileId));
    sizes[src] = size;
    rich.push({
      type: "photo",
      src,
      width: size[0],
      height: size[1],
      ...(b.caption ? { caption: b.caption } : {}),
    });
  }

  return {
    ...p,
    rich,
    // html/photos/tags — для превью в ленте, поиска, графа и статистики.
    html: rich.flatMap((b) => (b.type === "text" ? [b.html] : [])).join("\n\n"),
    photos: rich.flatMap((b) => (b.type === "photo" ? [b.src] : [])),
    tags: [...new Set([...p.tags, ...draft.tags])],
    sizes: { ...p.sizes, ...sizes },
    unsupported: undefined,
  };
}

/** Лента без просмотров — для сравнения «изменилось ли что-то по сути». */
const withoutViews = (posts: TgPost[]) =>
  JSON.stringify(posts.map(({ views: _v, ...rest }) => rest));

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const prevFeed = readFeed();
  const prevById = new Map(prevFeed.map((p) => [p.id, p]));

  console.log("Скрейплю канал…");
  const scraped = await fetchAllPosts();
  if (scraped.length === 0) {
    throw new Error("Скрейпер не вернул ни одного поста — ленту не трогаю");
  }
  console.log(`  постов: ${scraped.length}`);

  const feed: TgPost[] = [];
  for (const p of scraped) {
    // Превью ссылок и видео есть и у rich-постов — локализуем всем.
    const local = await localizePost(p);
    const post = p.unsupported ? await richPost(local, prevById.get(p.id)) : local;
    // JSON.stringify сам выкинет undefined-поля (unsupported у разобранных).
    feed.push(post);
  }

  // Картинки, на которые лента больше не ссылается, удаляем.
  for (const f of fs.readdirSync(IMG_DIR)) {
    if (f.endsWith(".webp") && !used.has(f)) fs.unlinkSync(path.join(IMG_DIR, f));
  }

  const clean: TgPost[] = JSON.parse(JSON.stringify(feed));
  if (withoutViews(clean) === withoutViews(prevFeed)) {
    console.log("Лента не изменилась (кроме просмотров) — файл не трогаю.");
    return;
  }
  fs.writeFileSync(FEED, JSON.stringify(clean, null, 2) + "\n");
  console.log(`Готово: ${FEED}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
