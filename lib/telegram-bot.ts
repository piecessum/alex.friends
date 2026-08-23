// Отправка в Telegram-канал через Bot API (запись) — используется публикацией
// из редактора. В отличие от scripts/publish-telegram.mjs (локальный CLI,
// шлёт через curl ради системных сертификатов) — это серверный код на
// Vercel, обычный fetch подходит без оговорок.

const CHANNEL = process.env.TELEGRAM_CHANNEL || "@ux_review";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN не задан в env");
  return t;
}

async function call<T>(method: string, body: FormData | Record<string, unknown>): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: isForm ? undefined : { "content-type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API (${method}): ${data.error_code} ${data.description}`);
  }
  return data.result as T;
}

export type SentMessage = {
  message_id: number;
  photo?: { file_id: string }[];
};

/** Обычное текстовое сообщение (HTML-разметка через parse_mode). */
export function sendMessage(params: {
  text: string;
  replyMarkup?: unknown;
}): Promise<SentMessage> {
  return call<SentMessage>("sendMessage", {
    chat_id: CHANNEL,
    text: params.text,
    parse_mode: "HTML",
    ...(params.replyMarkup ? { reply_markup: params.replyMarkup } : {}),
  });
}

/** Одна картинка с (опциональной) подписью. */
export function sendPhoto(params: {
  photo: Buffer;
  filename: string;
  caption?: string;
  replyMarkup?: unknown;
}): Promise<SentMessage> {
  const form = new FormData();
  form.set("chat_id", CHANNEL);
  if (params.caption) {
    form.set("caption", params.caption);
    form.set("parse_mode", "HTML");
  }
  if (params.replyMarkup) form.set("reply_markup", JSON.stringify(params.replyMarkup));
  form.set("photo", new Blob([new Uint8Array(params.photo)]), params.filename);
  return call<SentMessage>("sendPhoto", form);
}

/** Альбом из 2–10 фото (лимит Bot API), подпись — на первом элементе. */
export async function sendMediaGroup(params: {
  photos: { buffer: Buffer; filename: string }[];
  caption?: string;
}): Promise<SentMessage[]> {
  const form = new FormData();
  form.set("chat_id", CHANNEL);
  const media = params.photos.map((p, i) => ({
    type: "photo",
    media: `attach://photo${i}`,
    ...(i === 0 && params.caption
      ? { caption: params.caption, parse_mode: "HTML" }
      : {}),
  }));
  form.set("media", JSON.stringify(media));
  params.photos.forEach((p, i) => {
    form.set(`photo${i}`, new Blob([new Uint8Array(p.buffer)]), p.filename);
  });
  return call<SentMessage[]>("sendMediaGroup", form);
}
