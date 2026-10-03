// Посты в новой вёрстке Telegram (текст с картинками посреди и подписями к
// ним) веб-превью t.me/s не отдаёт — там только «Please open Telegram to view
// this post». Bot API их видит, но прочитать сообщение канала по id бот не
// может — только переслать. Поэтому пересылаем пост владельцу в личку с ботом
// (TELEGRAM_OWNER_ID, без звука), забираем из ответа `rich_message` и сразу
// удаляем пересланную копию. Используется только при синхронизации
// (scripts/sync-channel.ts) — один раз на пост, дальше берётся из
// content/channel-feed.json.

import { CHANNEL } from "@/lib/telegram";

const API = "https://api.telegram.org";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} не задан в env`);
  return v;
}

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/bot${env("TELEGRAM_BOT_TOKEN")}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API (${method}): ${data.error_code} ${data.description}`);
  }
  return data.result as T;
}

// --- сырые типы ответа Bot API -------------------------------------------

type RawSize = { file_id: string; width: number; height: number };
type RawEntity = {
  type: string;
  text?: RawText;
  url?: string;
  hashtag?: string;
  custom_emoji_id?: string;
  language?: string;
  [k: string]: unknown;
};
type RawText = string | RawEntity | RawText[];
type RawBlock = {
  type: string;
  text?: RawText;
  photo?: RawSize[];
  caption?: { text?: RawText };
  items?: (RawText | { text?: RawText })[];
  blocks?: RawBlock[];
  [k: string]: unknown;
};

/** Картинка rich-поста до скачивания: file_id самой крупной версии + размер. */
export type RichPhotoRef = {
  fileId: string;
  width: number;
  height: number;
  caption?: string;
};

/** Блоки после разбора: у фото вместо src пока ссылка на файл в Telegram. */
export type RichDraftBlock =
  | { type: "text"; html: string }
  | ({ type: "photo" } & RichPhotoRef);

export type RichDraft = { blocks: RichDraftBlock[]; tags: string[] };

// --- разбор текста ------------------------------------------------------

function esc(s: string): string {
  // U+FFFC — служебный плейсхолдер Telegram (см. sanitize в lib/telegram.ts),
  // на сайте он рисовался бы «тофу»-квадратиком.
  return s.replace(/\uFFFC/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}

function safeUrl(url: string | undefined): string | null {
  if (!url) return null;
  return /^(https?:|tg:|mailto:)/i.test(url) ? url : `https://${url}`;
}

const WRAP: Record<string, string> = {
  bold: "b",
  italic: "i",
  underline: "u",
  strikethrough: "s",
  code: "code",
  pre: "pre",
  spoiler: "tg-spoiler",
  blockquote: "blockquote",
  expandable_blockquote: "blockquote",
};

/** Оборачивает уже отрендеренный текст сущности в нужный HTML. */
function wrapEntity(
  e: { type: string; url?: string; hashtag?: string; custom_emoji_id?: string },
  inner: string,
  plain: string,
  tags: Set<string>
): string {
  const link = (href: string | null) =>
    href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : inner;

  switch (e.type) {
    case "url":
      return link(safeUrl(e.url ?? plain));
    case "text_link":
      return link(safeUrl(e.url));
    case "email":
      return link(`mailto:${plain}`);
    case "mention":
      return link(`https://t.me/${plain.replace(/^@/, "")}`);
    case "hashtag": {
      const tag = (e.hashtag ?? plain.replace(/^#/, "")).toLowerCase();
      if (tag) tags.add(tag);
      return link(`https://t.me/s/${CHANNEL}?q=${encodeURIComponent("#" + tag)}`);
    }
    case "custom_emoji":
      return e.custom_emoji_id
        ? `<img class="emoji" src="/api/tg-emoji/${encodeURIComponent(e.custom_emoji_id)}" alt="${escAttr(plain)}" />`
        : inner;
    default: {
      const tag = WRAP[e.type];
      return tag ? `<${tag}>${inner}</${tag}>` : inner;
    }
  }
}

/** Текст rich-блока (строка / сущность / массив) → безопасный HTML. */
function renderText(node: RawText | undefined, tags: Set<string>): string {
  if (node == null) return "";
  if (typeof node === "string") return esc(node);
  if (Array.isArray(node)) return node.map((n) => renderText(n, tags)).join("");
  const plain = typeof node.text === "string" ? node.text : "";
  return wrapEntity(node, renderText(node.text, tags), plain, tags);
}

type FlatEntity = {
  type: string;
  offset: number;
  length: number;
  url?: string;
  custom_emoji_id?: string;
};

/**
 * Обычное сообщение Bot API: text + entities (смещения в UTF-16 — как и
 * индексы строк JS) → HTML. Сущности вкладываются друг в друга (спойлер с
 * эмодзи внутри и т.п.); частичные пересечения обрезаются по родителю.
 */
function renderEntities(text: string, entities: FlatEntity[], tags: Set<string>): string {
  const sorted = [...entities].sort((a, b) => a.offset - b.offset || b.length - a.length);
  const walk = (start: number, end: number, list: FlatEntity[]): string => {
    let out = "";
    let pos = start;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.offset < pos) continue; // уже внутри предыдущей сущности
      const eEnd = Math.min(e.offset + e.length, end);
      out += esc(text.slice(pos, e.offset));
      const children = list.slice(i + 1).filter((c) => c.offset >= e.offset && c.offset < eEnd);
      const inner = walk(e.offset, eEnd, children);
      out += wrapEntity(e, inner, text.slice(e.offset, eEnd), tags);
      pos = eEnd;
    }
    return out + esc(text.slice(pos, end));
  };
  return walk(0, text.length, sorted);
}

function biggestPhoto(sizes: RawSize[]): RawSize | undefined {
  // Самая крупная версия, но не больше 1280 по ширине — крупнее сайту не нужно.
  const sorted = [...sizes].sort((a, b) => a.width - b.width);
  return [...sorted].reverse().find((s) => s.width <= 1280) ?? sorted.at(-1);
}

function convertBlocks(raw: RawBlock[], tags: Set<string>, out: RichDraftBlock[]) {
  for (const b of raw) {
    if (b.photo?.length) {
      const big = biggestPhoto(b.photo);
      if (!big) continue;
      const caption = b.caption?.text ? renderText(b.caption.text, tags).trim() : "";
      out.push({
        type: "photo",
        fileId: big.file_id,
        width: big.width,
        height: big.height,
        ...(caption ? { caption } : {}),
      });
      continue;
    }
    if (b.blocks?.length) {
      convertBlocks(b.blocks, tags, out);
      continue;
    }
    if (b.items?.length) {
      const items = b.items
        .map((it) =>
          renderText(
            typeof it === "object" && !Array.isArray(it) && "text" in it && !("type" in it)
              ? it.text
              : (it as RawText),
            tags
          )
        )
        .map((h) => `<li>${h}</li>`)
        .join("");
      const tag = /ordered|numbered/.test(b.type) ? "ol" : "ul";
      out.push({ type: "text", html: `<${tag}>${items}</${tag}>` });
      continue;
    }
    if (b.text !== undefined) {
      const html = renderText(b.text, tags);
      const wrap =
        /heading|header|title/.test(b.type) ? "b"
        : /quote/.test(b.type) ? "blockquote"
        : /pre|code/.test(b.type) ? "pre"
        : null;
      out.push({ type: "text", html: wrap && html ? `<${wrap}>${html}</${wrap}>` : html });
      continue;
    }
    console.warn(`[telegram-rich] неизвестный блок «${b.type}» — пропущен`);
  }
}

/** Склеивает соседние текстовые блоки (абзацы) в один — как в Telegram. */
function mergeText(blocks: RichDraftBlock[]): RichDraftBlock[] {
  const out: RichDraftBlock[] = [];
  for (const b of blocks) {
    const prev = out.at(-1);
    if (b.type === "text" && prev?.type === "text") {
      prev.html += "\n" + b.html;
    } else {
      out.push(b.type === "text" ? { ...b } : b);
    }
  }
  return out
    .map((b) => (b.type === "text" ? { ...b, html: b.html.trim() } : b))
    .filter((b) => b.type !== "text" || b.html);
}

type RawMessage = {
  message_id: number;
  rich_message?: { blocks?: RawBlock[] };
  text?: string;
  entities?: FlatEntity[];
  caption?: string;
  caption_entities?: FlatEntity[];
  photo?: RawSize[];
};

/**
 * Обычное сообщение (не rich): веб-превью не показывает и такие — например,
 * текст с кастомным эмодзи внутри спойлера. Как в Telegram: фото сверху,
 * текст/подпись под ним.
 */
function convertPlain(msg: RawMessage, tags: Set<string>): RichDraftBlock[] {
  const blocks: RichDraftBlock[] = [];
  const big = msg.photo?.length ? biggestPhoto(msg.photo) : undefined;
  if (big) blocks.push({ type: "photo", fileId: big.file_id, width: big.width, height: big.height });
  const text = msg.text ?? msg.caption;
  if (text) {
    const entities = msg.entities ?? msg.caption_entities ?? [];
    blocks.push({ type: "text", html: renderEntities(text, entities, tags) });
  }
  return blocks;
}

/**
 * Пересылает пост в личку владельцу, разбирает содержимое (rich_message или
 * обычный текст/фото), удаляет копию. null — если показать нечего.
 */
export async function fetchRichPost(messageId: string): Promise<RichDraft | null> {
  const owner = env("TELEGRAM_OWNER_ID");
  const msg = await call<RawMessage>(
    "forwardMessage",
    {
      chat_id: owner,
      from_chat_id: `@${CHANNEL}`,
      message_id: Number(messageId),
      disable_notification: true,
    }
  );
  try {
    await call("deleteMessage", { chat_id: owner, message_id: msg.message_id });
  } catch (e) {
    console.warn(`[telegram-rich] не удалось удалить пересланную копию: ${e}`);
  }

  const tags = new Set<string>();
  const blocks: RichDraftBlock[] = [];
  const raw = msg.rich_message?.blocks;
  if (raw?.length) convertBlocks(raw, tags, blocks);
  else blocks.push(...convertPlain(msg, tags));
  const merged = mergeText(blocks);
  return merged.length ? { blocks: merged, tags: [...tags] } : null;
}

/** Скачивает файл Telegram по file_id (картинку rich-поста). */
export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  const file = await call<{ file_path: string }>("getFile", { file_id: fileId });
  const res = await fetch(`${API}/file/bot${env("TELEGRAM_BOT_TOKEN")}/${file.file_path}`);
  if (!res.ok) throw new Error(`getFile download: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
