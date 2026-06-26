/**
 * Анонс заметки сайта в Telegram-канале @ux_review.
 *
 * Берёт уже опубликованную заметку (content/notes/<slug>.json), её обложку и
 * подпись, и шлёт в канал пост: фото-обложка + подпись + кнопка «Читать на
 * сайте». Это анонс со ссылкой, а не перенос всего лонгрида.
 *
 * Подпись (в порядке приоритета):
 *   1) флаг  --caption "текст"   или   --caption-file путь.txt
 *   2) поле  "telegram"          в самом content/notes/<slug>.json
 *   3) если ничего нет — заголовок заметки.
 * В подписи можно использовать HTML: <b>жирный</b>, <i>курсив</i>,
 * <a href="...">ссылка</a>.
 *
 * Запуск:
 *   node scripts/publish-telegram.mjs <slug> [--caption "..."] [--dry-run] [--force]
 * Примеры:
 *   node scripts/publish-telegram.mjs Dizajn-korobki-06-08 --dry-run
 *   node scripts/publish-telegram.mjs Dizajn-korobki-06-08 --caption "Разобрал, как..."
 *
 * Требуется (одноразовая настройка):
 *   .env.local:  TELEGRAM_BOT_TOKEN=8123...:AAH...
 *   и бот должен быть админом канала с правом «Публикация сообщений».
 * Необязательно: TELEGRAM_CHANNEL (по умолчанию @ux_review), SITE_URL.
 *
 * Сеть идёт через curl (системные сертификаты) — как и остальные скрипты,
 * чтобы работало и за корпоративным прокси.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content", "notes");
const PUBLIC_DIR = path.join(ROOT, "public");
const LOG_FILE = path.join(CONTENT_DIR, "_telegram-log.json");

// Telegram caption (под фото) ограничен 1024 символами.
const CAPTION_LIMIT = 1024;

// --- .env.local (минимальный парсер KEY=VALUE) --------------------------------
function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}
loadEnv();

// --- аргументы ----------------------------------------------------------------
const args = process.argv.slice(2);
const opt = { dryRun: false, force: false, noPhoto: false, caption: null };
let slug = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dry-run") opt.dryRun = true;
  else if (a === "--force") opt.force = true;
  else if (a === "--no-photo") opt.noPhoto = true;
  else if (a === "--caption" || a === "-c") opt.caption = args[++i];
  else if (a === "--caption-file") opt.caption = fs.readFileSync(args[++i], "utf8").trim();
  else if (!a.startsWith("-")) slug = a;
  else die(`Неизвестный флаг: ${a}`);
}

function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (!slug) {
  const available = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "index.json")
    .map((f) => "  " + f.replace(/\.json$/, ""))
    .join("\n");
  die(`Укажи slug заметки. Доступные:\n${available}`);
}

// --- конфиг -------------------------------------------------------------------
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL || "@ux_review";
const SITE_URL = (process.env.SITE_URL || "https://alex-friends.vercel.app").replace(/\/$/, "");

if (!opt.dryRun && !TOKEN) {
  die(
    "Нет TELEGRAM_BOT_TOKEN. Создай бота у @BotFather, добавь его админом\n" +
      "  канала с правом «Публикация сообщений» и положи токен в .env.local:\n" +
      "    TELEGRAM_BOT_TOKEN=8123...:AAH...\n" +
      "  (или запусти с --dry-run, чтобы только посмотреть текст поста)"
  );
}

// --- заметка ------------------------------------------------------------------
const notePath = path.join(CONTENT_DIR, `${slug}.json`);
if (!fs.existsSync(notePath)) die(`Нет заметки: content/notes/${slug}.json`);
const note = JSON.parse(fs.readFileSync(notePath, "utf8"));

const index = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, "index.json"), "utf8"));
const indexed = index.find((n) => n.slug === slug);

// Обложка: из index.json, иначе первая картинка в content.
function firstImage() {
  if (indexed?.cover) return indexed.cover;
  for (const block of note.content || []) {
    const img = findImg(block);
    if (img) return img;
  }
  return null;
}
function findImg(node) {
  if (!node || typeof node !== "object") return null;
  if (node.tag === "img" && node.attrs?.src) return node.attrs.src;
  for (const c of node.children || []) {
    const r = findImg(c);
    if (r) return r;
  }
  return null;
}

const cover = firstImage();
const coverSrc = cover ? path.join(PUBLIC_DIR, cover.replace(/^\//, "")) : null;
const hasPhoto = !opt.noPhoto && coverSrc && fs.existsSync(coverSrc);

// Telegram sendPhoto не принимает .webp как фото — конвертируем в JPEG
// встроенным в macOS sips. Возвращаем путь к готовому для отправки файлу.
function preparePhoto(src) {
  if (!/\.webp$/i.test(src)) return src;
  const out = path.join(os.tmpdir(), `tg-${path.basename(src, ".webp")}.jpg`);
  try {
    execFileSync("sips", ["-s", "format", "jpeg", src, "--out", out], {
      stdio: "ignore",
    });
    return out;
  } catch {
    die(
      "Не удалось конвертировать .webp обложку в JPEG (нужен sips на macOS).\n" +
        "  Можно опубликовать без фото — добавь --no-photo."
    );
  }
}

// --- подпись ------------------------------------------------------------------
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Подпись из заметки/флага считаем уже валидным HTML (можно <b>, <a> и т.п.),
// а из заголовка — экранируем.
const caption = opt.caption ?? note.telegram ?? `<b>${esc(note.title)}</b>`;
const url = `${SITE_URL}/notes/${slug}`;

// Текст уходит в caption под фото; кнопка-ссылка — отдельно через reply_markup.
const text = caption.trim();

// Хэштеги из подписи — ими лонгрид помечается в ленте/статистике сайта
// (см. lib/notes.ts: теги подмешиваются к заметке из этого лога).
const tags = [
  ...new Set(
    [...text.replace(/<[^>]+>/g, " ").matchAll(/#([\p{L}\p{N}_]+)/giu)]
      .map((m) => m[1].toLowerCase())
      .filter((t) => t && !/^\d+$/.test(t))
  ),
];
const replyMarkup = JSON.stringify({
  inline_keyboard: [[{ text: "Читать на сайте →", url }]],
});

// --- защита от повторной публикации ------------------------------------------
let log = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, "utf8")) : {};
if (log[slug] && !opt.force && !opt.dryRun) {
  die(
    `Эта заметка уже постилась в канал (message_id ${log[slug].message_id}).\n` +
      "  Повторить — добавь --force."
  );
}

// --- предпросмотр -------------------------------------------------------------
console.log("\n─ Превью поста в Telegram ─────────────────────────────");
console.log("Канал:   " + CHANNEL);
console.log("Фото:    " + (hasPhoto ? cover : "— (нет обложки, уйдёт текстом)"));
console.log("Ссылка:  " + url + "  (кнопка «Читать на сайте →»)");
console.log("Теги:    " + (tags.length ? tags.map((t) => "#" + t).join(" ") : "—"));
console.log("Подпись:\n" + text.replace(/^/gm, "  "));
if (text.length > CAPTION_LIMIT && hasPhoto) {
  console.log(
    `\n⚠ Подпись ${text.length} символов > ${CAPTION_LIMIT}: уйдёт фото + отдельным сообщением текст.`
  );
}
console.log("───────────────────────────────────────────────────────\n");

if (opt.dryRun) {
  console.log("Это --dry-run, ничего не отправлено.");
  process.exit(0);
}

// --- отправка через curl ------------------------------------------------------
// Текстовые поля — через --form-string (иначе curl примет значение на «@»/«<»
// за путь к файлу, напр. chat_id=@ux_review). Фото — через -F с «@путь».
function api(method, fields, files = {}) {
  const argv = ["-sS", "-X", "POST", `https://api.telegram.org/bot${TOKEN}/${method}`];
  for (const [k, v] of Object.entries(fields)) argv.push("--form-string", `${k}=${v}`);
  for (const [k, v] of Object.entries(files)) argv.push("-F", `${k}=@${v}`);
  const raw = execFileSync("curl", argv, { encoding: "utf8", maxBuffer: 1 << 24 });
  const res = JSON.parse(raw);
  if (!res.ok) die(`Telegram API (${method}): ${res.error_code} ${res.description}`);
  return res.result;
}

let result;
if (hasPhoto && text.length <= CAPTION_LIMIT) {
  result = api(
    "sendPhoto",
    { chat_id: CHANNEL, caption: text, parse_mode: "HTML", reply_markup: replyMarkup },
    { photo: preparePhoto(coverSrc) }
  );
} else if (hasPhoto) {
  // Подпись длиннее лимита: фото без подписи, текст отдельным сообщением.
  api("sendPhoto", { chat_id: CHANNEL }, { photo: preparePhoto(coverSrc) });
  result = api("sendMessage", {
    chat_id: CHANNEL,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
} else {
  result = api("sendMessage", {
    chat_id: CHANNEL,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

// --- лог ----------------------------------------------------------------------
log[slug] = {
  message_id: result.message_id,
  date: new Date().toISOString(),
  url: `https://t.me/${CHANNEL.replace(/^@/, "")}/${result.message_id}`,
  tags,
};
fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + "\n");

console.log(`✓ Опубликовано: ${log[slug].url}`);
