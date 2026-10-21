// Поиск настоящего фото для превью исследования:
//   npx tsx scripts/find-cover-photo.ts "stopwatch"
//
// Ищет на Wikimedia Commons (и на Pexels, если есть PEXELS_API_KEY) снимки
// с лицензией, которая разрешает свободно использовать и изменять картинку:
// Public domain, CC0, CC BY (с указанием автора). CC BY-SA, NC и ND — нет.
// Печатает пронумерованный список и собирает превью кандидатов на один лист
// /tmp/cover-candidates.png — посмотри его (Read) и выбери номер, потом
// перенеси поля кандидата в coverImage исследования (см. AGENT.md).

import "./load-env";
import sharp, { type OverlayOptions } from "sharp";

const UA = "alex-friends-research-cover/1.0 (https://alex-friends.vercel.app)";
const OUT = "/tmp/cover-candidates.png";

type Candidate = { url: string; page: string; author: string; license: string; source: string; w: number; h: number; title: string };

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** Лицензия разрешает изменять и не требует share-alike. */
function allowed(license: string): boolean {
  const l = license.toLowerCase();
  if (/sa|nc|nd|fair use|copyright/.test(l.replace(/public domain/, ""))) return false;
  return /public domain|^pd|cc0|cc by/.test(l);
}

async function commons(query: string): Promise<Candidate[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6" +
    `&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&gsrlimit=40` +
    "&prop=imageinfo&iiprop=url|size|extmetadata&iiextmetadatafilter=LicenseShortName|Artist&iiurlwidth=1600";
  const data = await (await fetch(url, { headers: { "user-agent": UA } })).json();
  const pages = Object.values(data?.query?.pages ?? {}) as {
    title: string;
    index: number;
    imageinfo: { width: number; height: number; thumburl?: string; url: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[];
  }[];
  return pages
    .sort((a, b) => a.index - b.index)
    .map((p) => {
      const ii = p.imageinfo[0];
      return {
        url: ii.thumburl ?? ii.url,
        page: ii.descriptionurl,
        author: stripTags(ii.extmetadata?.Artist?.value ?? "неизвестен").slice(0, 80),
        license: ii.extmetadata?.LicenseShortName?.value ?? "",
        source: "Wikimedia Commons",
        w: ii.width,
        h: ii.height,
        title: p.title.replace(/^File:/, ""),
      };
    })
    .filter((c) => allowed(c.license) && Math.min(c.w, c.h) >= 800);
}

async function pexels(query: string): Promise<Candidate[]> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return [];
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`, {
    headers: { authorization: key },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    photos: { url: string; photographer: string; width: number; height: number; alt: string; src: { large2x: string } }[];
  };
  return data.photos.map((p) => ({
    url: p.src.large2x,
    page: p.url,
    author: p.photographer,
    license: "Pexels License",
    source: "Pexels",
    w: p.width,
    h: p.height,
    title: p.alt,
  }));
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) throw new Error('укажи запрос: npx tsx scripts/find-cover-photo.ts "stopwatch"');
  const list = [...(await pexels(query)), ...(await commons(query))].slice(0, 12);
  if (!list.length) {
    console.log("Ничего не нашлось — попробуй другой запрос (проще, по-английски).");
    return;
  }

  // Лист превью: 4 в ряд, номер в углу каждой.
  const cw = 300, ch = 225, cols = 4, rows = Math.ceil(list.length / cols);
  const tiles: OverlayOptions[] = [];
  for (const [i, c] of list.entries()) {
    try {
      const buf = Buffer.from(await (await fetch(c.url, { headers: { "user-agent": UA } })).arrayBuffer());
      const img = await sharp(buf).resize(cw - 8, ch - 8, { fit: "contain", background: "#ffffff" }).png().toBuffer();
      const label = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="28"><rect width="36" height="28" rx="6" fill="#111"/><text x="18" y="20" font-size="16" font-family="Helvetica" font-weight="bold" fill="#fff" text-anchor="middle">${i + 1}</text></svg>`
      );
      const left = (i % cols) * cw + 4, top = Math.floor(i / cols) * ch + 4;
      tiles.push({ input: img, left, top }, { input: label, left: left + 4, top: top + 4 });
    } catch {
      // не скачалось — просто пропускаем плитку
    }
  }
  await sharp({ create: { width: cw * cols, height: ch * rows, channels: 3, background: "#dddddd" } })
    .composite(tiles)
    .png()
    .toFile(OUT);

  for (const [i, c] of list.entries()) {
    console.log(
      `${i + 1}. ${c.title}\n   ${c.w}×${c.h} · ${c.license} · ${c.author} · ${c.source}\n` +
        `   "coverImage": ${JSON.stringify({ url: c.url, page: c.page, author: c.author, license: c.license, source: c.source, mode: "cutout" })}`
    );
  }
  console.log(`\nЛист превью: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
