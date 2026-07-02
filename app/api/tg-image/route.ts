import type { NextRequest } from "next/server";

// Прокси картинок Telegram: браузер грузит изображение с нашего домена, а не
// напрямую с cdn telesco.pe. Так ссылка перестаёт зависеть от временных токенов
// Telegram и hotlink/приватных блокировок, а байты кэшируются нашим CDN.

// Разрешаем ходить только на хосты Telegram — чтобы не превратиться в open-proxy.
const ALLOWED_HOST = /(^|\.)telesco\.pe$|(^|\.)telegram\.org$/;

// Ответ (успешная картинка) кэшируется надолго — раз скачав файл, отдаём его
// сами и больше не зависим от Telegram.
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) return new Response("missing u", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOST.test(target.hostname)) {
    return new Response("forbidden host", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36",
        accept: "image/avif,image/webp,image/*,*/*",
      },
      // Кэшируем апстрим на сутки на уровне Next data cache.
      next: { revalidate: 86400 },
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("upstream error", { status: 502 });
  }

  const buf = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": CACHE,
    },
  });
}
