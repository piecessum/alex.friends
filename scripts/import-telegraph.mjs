/**
 * Импорт лонгридов с Telegra.ph в сайт.
 *
 * Тянет каждую статью через публичный API Telegra.ph, скачивает картинки/видео
 * в public/notes/ и сохраняет контент в content/notes/<slug>.json.
 * YouTube-вставки переводятся на прямой embed (без зависимости от telegra.ph).
 *
 * Запуск:  node scripts/import-telegraph.mjs
 * Сеть идёт через curl (системные сертификаты), а не через fetch — так работает
 * и за корпоративным прокси.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content", "notes");
const PUBLIC_DIR = path.join(ROOT, "public", "notes");

// Порядок = как прислал Алексей (сверху — новее).
const SLUGS = [
  "Dizajn-korobki-06-08",
  "Otobrazhenie-uvedomlenij-v-korzine-05-25",
  "Novaya-mobilnaya-versiya-onlajn-marketa-05-25",
  "Karta-fajlov-Figmy-05-25",
  "Meloch-03-03",
  "Fitness--trenirovki-dlya-poridzhej-02-07",
  "Izobrazheniya-dlya-vidzhetov-01-23",
  "Sozdanie-prostogo-i-uyutnogo-sajta-dlya-Spiroplyota-12-08",
  "Bespoleznaya-biblioteka-iOS-11-03",
  "Tvich--navigaciya-prilozheniya-10-08",
  "Zakazy-v-YAndeks-Markete-09-26",
  "Moj-vzglyad-na-YAndeksMuzyku-05-10",
  "Tegger-05-02",
  "Sravnenie-UX-Kazani-i-Sankt-Peterburga-04-23",
  "YAndeks-i-reklama-02-14",
  "Plohoj-UX-YAMuzyki-01-26",
  "Apgrejd-tablicy-Mendeleeva-01-21",
  "Gugl-perevodchik-01-18",
  "Amazon-urodlivyj-ili-net-10-14",
  "SHum-pri-poiske-08-30",
  "Zametki-07-28-2",
  "Raspisanie-marshruta-06-17",
  "Vyorstka-uvedomlenij-06-07",
  "Tablica-arhitipov-05-27",
  "Master-detali-05-16",
  "Grafik-razvodnyh-mostov-04-07",
  "Tablichka-u-paradnoj-03-02",
  "Proverka-kontrasta-02-13",
  "Soobshchenie-passazhiram-02-08",
  "Poleznaya-animaciya-02-05",
  "Tvitter-Dizajn-oblasti-tehgov-12-21",
  "Prilozhenie-gosuslug-12-20",
  "Reklamnyj-dashbord-vk-12-19",
  "Informacionnyj-shchit-v-metro-12-12",
  "Kak-ya-sdaval-radioavtomatiku-12-07",
  "Naklejka-o-smene-marshruta-12-05",
  "Altium-Designer-12-03",
  "Instagram-na-desktope-10-24",
  "Superap-10-22",
  "Pochemu-socset-Vkontakte-zlo-10-22",
  "Vyravnivanie-po-krayu-10-10",
  "Novye-slova-09-30",
];

const curl = (url, asBinary = false) =>
  execFileSync("curl", ["-sSL", url], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: asBinary ? "buffer" : "utf8",
  });

const monthFromSlug = (slug) => {
  const m = slug.match(/-(\d{2})-(\d{2})(?:-\d+)?$/);
  return m ? { month: Number(m[1]), day: Number(m[2]) } : { month: 0, day: 0 };
};

const youtubeId = (raw) => {
  const url = decodeURIComponent(raw.replace(/^\/embed\/youtube\?url=/, ""));
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  return m ? m[1] : null;
};

const firstText = (nodes) => {
  for (const n of nodes) {
    if (typeof n === "string" && n.trim()) return n.trim();
    if (n && n.children) {
      const t = firstText(n.children);
      if (t) return t;
    }
  }
  return "";
};

let firstImage = null;
const downloaded = new Set();

function walk(node) {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;
  const attrs = node.attrs || {};
  const src = attrs.src;

  if (node.tag === "iframe" && src && src.includes("/embed/youtube")) {
    const id = youtubeId(src);
    if (id) node.attrs = { src: `https://www.youtube.com/embed/${id}` };
  } else if (src && src.startsWith("/file/")) {
    const base = src.split("/").pop();
    const dest = path.join(PUBLIC_DIR, base);
    if (!downloaded.has(base) && !fs.existsSync(dest)) {
      const buf = curl(`https://telegra.ph${src}`, true);
      fs.writeFileSync(dest, buf);
      downloaded.add(base);
    }
    node.attrs = { ...attrs, src: `/notes/${base}` };
    if (node.tag === "img" && !firstImage) firstImage = `/notes/${base}`;
  }

  if (Array.isArray(node.children)) node.children = node.children.map(walk);
  return node;
}

fs.mkdirSync(CONTENT_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const index = [];

for (const slug of SLUGS) {
  process.stdout.write(`• ${slug} … `);
  const data = JSON.parse(
    curl(`https://api.telegra.ph/getPage/${slug}?return_content=true`)
  );
  if (!data.ok) {
    console.log("ПРОПУЩЕНО (API вернул ошибку)");
    continue;
  }
  const r = data.result;
  firstImage = null;
  const content = (r.content || []).map(walk);
  const { month, day } = monthFromSlug(slug);
  const excerpt = firstText(content).slice(0, 180);

  fs.writeFileSync(
    path.join(CONTENT_DIR, `${slug}.json`),
    JSON.stringify(
      {
        slug,
        title: r.title || slug,
        author: r.author_name || "",
        views: r.views || 0,
        month,
        day,
        original: `https://telegra.ph/${slug}`,
        content,
      },
      null,
      2
    )
  );

  index.push({ slug, title: r.title || slug, month, day, excerpt, cover: firstImage });
  console.log(`ok (${content.length} блоков, обложка: ${firstImage ? "да" : "нет"})`);
}

fs.writeFileSync(
  path.join(CONTENT_DIR, "index.json"),
  JSON.stringify(index, null, 2)
);

console.log(`\nГотово: ${index.length} статей, картинок скачано: ${downloaded.size}`);
