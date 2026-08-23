import type { NextRequest } from "next/server";
import { getFilePath } from "@/lib/telegram-emoji";

// Отдаёт байты картинки короткого поста (заведённого через /admin) по её
// Telegram file_id — по образцу app/api/tg-emoji/[id]/route.ts. Токен бота не
// покидает сервер; file_id стабилен, поэтому кэшируем агрессивно.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

// api.telegram.org/file/... часто отдаёт content-type: application/octet-stream
// вместо настоящего MIME (в отличие от CDN telesco.pe, см. app/api/tg-image) —
// подстраховываемся расширением из file_path.
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function guessContentType(filePath: string, upstreamType: string | null): string {
  if (upstreamType && upstreamType !== "application/octet-stream") return upstreamType;
  const ext = filePath.split(".").pop()?.toLowerCase();
  return (ext && EXT_MIME[ext]) || upstreamType || "image/jpeg";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  if (!TOKEN || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
    return new Response("bad id", { status: 400 });
  }

  const filePath = await getFilePath(fileId);
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
    "content-type": guessContentType(filePath, upstream.headers.get("content-type")),
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
