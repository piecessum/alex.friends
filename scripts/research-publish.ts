// Публикация исследований в Telegram-канал: npm run research:publish
// Каждое исследование, чья дата уже наступила и которое ещё не постилось
// (нет поля telegram), уходит в канал: превью + заголовок + лид + ссылка на
// сайт. После отправки в JSON пишется telegram.messageId — повторно не уйдёт.
// Запускать ПОСЛЕ деплоя, чтобы ссылка на сайт уже открывалась.
// --refresh=slug,slug — у уже опубликованных заменить картинку и подпись в
// посте канала (после перерисовки превью), без повторной публикации.
// Нужны TELEGRAM_BOT_TOKEN и RESEARCH_CHANNEL_ID (бот — админ канала).

import "./load-env";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Research } from "@/lib/research";

const DIR = path.join(process.cwd(), "content", "research");
const SITE = process.env.SITE_URL || "https://alex-friends.vercel.app";
const CHANNEL = process.env.RESEARCH_CHANNEL_ID || "-1004400783573";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sendPhoto(photo: Buffer, caption: string): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const form = new FormData();
  form.set("chat_id", CHANNEL);
  form.set("caption", caption);
  form.set("parse_mode", "HTML");
  form.set("photo", new Blob([new Uint8Array(photo)]), "cover.jpg");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram: ${data.error_code} ${data.description}`);
  return data.result.message_id;
}

async function editPhoto(messageId: number, photo: Buffer, caption: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const form = new FormData();
  form.set("chat_id", CHANNEL);
  form.set("message_id", String(messageId));
  form.set(
    "media",
    JSON.stringify({ type: "photo", media: "attach://photo", caption, parse_mode: "HTML" })
  );
  form.set("photo", new Blob([new Uint8Array(photo)]), "cover.jpg");
  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageMedia`, { method: "POST", body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram: ${data.error_code} ${data.description}`);
}

const caption = (r: Research) =>
  `<b>${esc(r.title)}</b>\n\n${esc(r.dek)}\n\n` +
  `<a href="${SITE}/research/${r.slug}">Читать на сайте →</a>`;

// Telegram сжимает фото сам; webp как photo он принимает не всегда — шлём jpg.
const coverJpeg = (r: Research) =>
  sharp(path.join(process.cwd(), "public", r.cover!)).jpeg({ quality: 88 }).toBuffer();

async function main() {
  const refresh = process.argv.find((a) => a.startsWith("--refresh="))?.slice(10).split(",").filter(Boolean) ?? [];
  for (const slug of refresh) {
    const p = path.join(DIR, `${slug}.json`);
    const r: Research = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!r.telegram || !r.cover) {
      console.warn(`  ! ${slug}: ещё не опубликован или нет превью — нечего обновлять`);
      continue;
    }
    await editPhoto(r.telegram.messageId, await coverJpeg(r), caption(r));
    console.log(`Обновлено в канале: ${slug} (сообщение ${r.telegram.messageId})`);
  }

  const now = Date.now();
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
  const due = files
    .map((f) => ({ p: path.join(DIR, f), r: JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Research }))
    .filter(({ r }) => !r.telegram && new Date(r.date).getTime() <= now)
    .sort((a, b) => a.r.date.localeCompare(b.r.date)); // старые — первыми

  for (const { p, r } of due) {
    if (!r.cover) {
      console.warn(`  ! ${r.slug}: нет превью — пропускаю (сначала npm run research:cover)`);
      continue;
    }
    const messageId = await sendPhoto(await coverJpeg(r), caption(r));
    r.telegram = { messageId, postedAt: new Date().toISOString() };
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
    console.log(`Опубликовано: ${r.slug} → сообщение ${messageId}`);
  }
  if (due.length === 0 && refresh.length === 0) console.log("Нечего публиковать.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
