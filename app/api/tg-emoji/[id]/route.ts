import type { NextRequest } from "next/server";
import { resolveCustomEmojis, getFilePath } from "@/lib/telegram-emoji";

// Отдаёт статичное превью кастомного эмодзи (webp) по его custom_emoji_id.
// Токен бота не покидает сервер — браузер видит только этот прокси-URL,
// вшитый в HTML поста лентой (см. lib/telegram.ts).
//
// Намеренно всегда отдаём статичную картинку, а не реальный webm-стикер:
// у видео-стикеров альфа-канал (прозрачный фон) корректно показывает
// в <video> по сути только Chromium — в Safari/WebKit «прозрачные» пиксели
// становятся сплошным чёрным квадратом. thumbnail же — обычный webp
// с настоящей прозрачностью, одинаково работает везде.

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

  const filePath = await getFilePath(info.thumbFileId);
  if (!filePath) return new Response("not found", { status: 404 });

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
  const headers: Record<string, string> = {
    "content-type": "image/webp",
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
