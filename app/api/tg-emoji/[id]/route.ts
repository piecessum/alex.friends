import type { NextRequest } from "next/server";
import { resolveCustomEmojis, getFilePath } from "@/lib/telegram-emoji";

// Отдаёт реальный файл кастомного эмодзи (webm-анимация или статичное превью)
// по его custom_emoji_id. Токен бота не покидает сервер — браузер видит
// только этот прокси-URL, вшитый в HTML поста лентой (см. lib/telegram.ts).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!TOKEN || !/^\d+$/.test(id)) {
    return new Response("bad id", { status: 400 });
  }

  const info = (await resolveCustomEmojis([id])).get(id);
  if (!info) return new Response("not found", { status: 404 });

  // Видео — реальный webm-стикер; иначе (tgs/статика) — гарантированно
  // растровое превью, которое можно показать как обычную картинку.
  const fileId = info.isVideo ? info.fileId : info.thumbFileId;
  const filePath = await getFilePath(fileId);
  if (!filePath) return new Response("not found", { status: 404 });

  // Файл Telegram поддерживает Range — пробрасываем заголовок клиента как
  // есть. Без этого Safari/WebKit молча отказывается проигрывать <video>
  // (просто пустое место), даже если сам файл рабочий.
  const range = req.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.telegram.org/file/bot${TOKEN}/${filePath}`,
      {
        headers: range ? { range } : undefined,
        next: { revalidate: 86400 },
      }
    );
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
  if (!upstream.ok) return new Response("upstream error", { status: 502 });

  const buf = await upstream.arrayBuffer();
  // Файловый сервер Telegram сам обычно отдаёт application/octet-stream —
  // тип по факту (webm/webp) уже известен из getCustomEmojiStickers.
  const contentType = info.isVideo ? "video/webm" : "image/webp";

  const headers: Record<string, string> = {
    "content-type": contentType,
    "cache-control": CACHE,
    "accept-ranges": "bytes",
  };
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers["content-range"] = contentRange;

  return new Response(buf, {
    status: upstream.status,
    headers,
  });
}
