// Публикация исследований в Telegram-канал: npm run research:publish
// Ритм канала (по Москве): пн–пт — с 08:00 ровно одно исследование, то,
// что вышло сегодня (date или telegramAt — сегодняшние); суббота — дайджест
// недели; воскресенье — выходной. Вечерних постов и «догоняния» нет: если
// статья дня по какой-то причине не ушла в свой день, в канал она уже не
// попадает — она есть на сайте и в субботнем дайджесте.
// Пост: превью + заголовок + лид + ссылка на сайт. После отправки в JSON пишется telegram.messageId — повторно не уйдёт.
// Запускать ПОСЛЕ деплоя, чтобы ссылка на сайт уже открывалась.
// --refresh=slug,slug — у уже опубликованных заменить картинку и подпись в
// посте канала (после перерисовки превью), без повторной публикации.
// Нужны TELEGRAM_BOT_TOKEN и RESEARCH_CHANNEL_ID (бот — админ канала).

import "./load-env";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { COVER_STYLE, DIGEST_DIR, type Research, type ResearchDigest } from "@/lib/research";

const DIR = path.join(process.cwd(), "content", "research");
const SITE = process.env.SITE_URL || "https://alex-friends.vercel.app";
const CHANNEL = process.env.RESEARCH_CHANNEL_ID || "-1004400783573";

/** Раньше этого часа (МСК) в канал не постим. */
const POST_FROM_HOUR = 8;

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

/** Текстовый пост (дайджест) — без превью ссылок, просто список. */
async function sendText(text: string): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: CHANNEL,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    }),
  });
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
  // Та же картинка и подпись — Telegram отвечает «not modified», это не ошибка.
  if (!data.ok && !/not modified/i.test(data.description)) {
    throw new Error(`Telegram: ${data.error_code} ${data.description}`);
  }
}

const caption = (r: Research) =>
  `<b>${esc(r.title)}</b>\n\n${esc(r.dek)}\n\n` +
  `<a href="${SITE}/research/${r.slug}">Читать на сайте →</a>`;

const digestCaption = (d: ResearchDigest, titles: Map<string, string>) =>
  `<b>Дайджест недели</b>\n\n` +
  d.items
    .filter((i) => titles.has(i.slug))
    .map((i, n) => `${n + 1}. <a href="${SITE}/research/${i.slug}">${esc(titles.get(i.slug)!)}</a>`)
    .join("\n");

// Telegram сжимает фото сам; webp как photo он принимает не всегда — шлём jpg.
const coverJpeg = (r: Research) =>
  sharp(path.join(process.cwd(), "public", r.cover!)).jpeg({ quality: 88 }).toBuffer();

async function main() {
  const refresh = process.argv.find((a) => a.startsWith("--refresh="))?.slice(10).split(",").filter(Boolean) ?? [];
  // Превью перерисовалось (новый стиль и т.п.) — пост в канале тоже обновить.
  for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
    const r: Research = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
    if (r.telegram && r.cover && r.telegram.cover !== r.cover && !refresh.includes(r.slug)) {
      refresh.push(r.slug);
    }
  }
  for (const slug of refresh) {
    const p = path.join(DIR, `${slug}.json`);
    const r: Research = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!r.telegram || !r.cover) {
      console.warn(`  ! ${slug}: ещё не опубликован или нет превью — нечего обновлять`);
      continue;
    }
    await editPhoto(r.telegram.messageId, await coverJpeg(r), caption(r));
    r.telegram.cover = r.cover;
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
    console.log(`Обновлено в канале: ${slug} (сообщение ${r.telegram.messageId})`);
  }

  const now = Date.now();
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
  const all = files.map((f) => ({
    p: path.join(DIR, f),
    r: JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Research,
  }));

  // Правило канала: не больше одного поста в сутки (по Москве) и не раньше
  // 08:00. На сайте исследования появляются сразу, а в канал уходят по
  // очереди — самое старое из ожидающих (telegramAt — «не раньше»).
  const msk = new Date(now + 3 * 3600_000);
  const mskDay = (t: number) => new Date(t + 3 * 3600_000).toISOString().slice(0, 10);
  const mskHour = msk.getUTCHours();
  const weekday = msk.getUTCDay(); // 0 — воскресенье, 6 — суббота
  const postedToday = all.filter(
    ({ r }) => r.telegram && mskDay(new Date(r.telegram.postedAt).getTime()) === mskDay(now)
  ).length;
  // Кандидаты — только статьи сегодняшнего дня (по Москве), уже наступившие.
  // Превью старого стиля в канал не отправляем — ждём перерисовки.
  const queue = all
    .filter(({ r }) => {
      const at = new Date(r.telegramAt ?? r.date).getTime();
      return !r.telegram && r.cover && r.coverStyle === COVER_STYLE && at <= now && mskDay(at) === mskDay(now);
    })
    .sort((a, b) => (a.r.telegramAt ?? a.r.date).localeCompare(b.r.telegramAt ?? b.r.date));
  // По будням — одна статья в день, в выходные — ни одной.
  const allowed = weekday === 0 || weekday === 6 || mskHour < POST_FROM_HOUR ? 0 : 1;
  const due = queue.slice(0, Math.max(0, allowed - postedToday));
  if (queue.length && !due.length) {
    console.log(
      weekday === 0 || weekday === 6
        ? `Выходные — исследования в канал не постим, в очереди: ${queue.length}`
        : mskHour < POST_FROM_HOUR
          ? `До ${POST_FROM_HOUR}:00 МСК в канал не постим — в очереди: ${queue.length}`
          : `Сегодня в канале уже было ${postedToday} — в очереди ждут: ${queue.length}`
    );
  }

  for (const { p, r } of due) {
    if (!r.cover) {
      console.warn(`  ! ${r.slug}: нет превью — пропускаю (сначала npm run research:cover)`);
      continue;
    }
    const messageId = await sendPhoto(await coverJpeg(r), caption(r));
    r.telegram = { messageId, postedAt: new Date().toISOString(), cover: r.cover };
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
    console.log(`Опубликовано: ${r.slug} → сообщение ${messageId}`);
  }
  // Суббота — дайджест недели (с 08:00), если он готов и ещё не постился.
  if (weekday === 6 && mskHour >= POST_FROM_HOUR && fs.existsSync(DIGEST_DIR)) {
    const titles = new Map(all.map(({ r }) => [r.slug, r.title]));
    for (const f of fs.readdirSync(DIGEST_DIR).filter((f) => f.endsWith(".json"))) {
      const p = path.join(DIGEST_DIR, f);
      const d: ResearchDigest = JSON.parse(fs.readFileSync(p, "utf8"));
      if (d.telegram || !d.poster || new Date(d.date).getTime() > now) continue;
      if (mskDay(new Date(d.date).getTime()) !== mskDay(now)) continue; // старые не догоняем
      // Дайджест — картинка «#N» и список ссылок в подписи. Подпись к фото у
      // Telegram — до 1024 символов; длиннее — список уходит следом текстом.
      const photo = await sharp(path.join(process.cwd(), "public", d.poster)).jpeg({ quality: 88 }).toBuffer();
      const text = digestCaption(d, titles);
      const fits = text.replace(/<[^>]+>/g, "").length <= 1024;
      const messageId = await sendPhoto(photo, fits ? text : "<b>Дайджест недели</b>");
      if (!fits) await sendText(text);
      d.telegram = { messageId, postedAt: new Date().toISOString(), cover: d.poster };
      fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
      console.log(`Опубликован дайджест: ${d.slug} → сообщение ${messageId}`);
    }
  }

  if (queue.length === 0 && refresh.length === 0) console.log("Нечего публиковать.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
