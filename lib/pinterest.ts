// Сохранённые пины из Pinterest (pinterest.com/piecesux) для страницы /pins.
// Официальный API требует OAuth-приложение, поэтому берём тот же внутренний
// эндпоинт, что дёргает сам сайт Pinterest при прокрутке профиля
// (UserPinsResource) — ему нужны только cookie и csrftoken с главной профиля.
// Вызывается синхронизацией (scripts/sync-pinterest.ts); сайт читает готовый
// content/pins.json. Картинки не качаем — отдаёт CDN Pinterest (i.pinimg.com):
// ссылки постоянные, а 2000+ файлов раздули бы репозиторий.

import fs from "node:fs";
import path from "node:path";
import type { Pin } from "@/lib/pin-urls";

export const PINTEREST_USER = "piecesux";

export type { Pin } from "@/lib/pin-urls";
export { pinSrc, pinSrcSet, pinUrl } from "@/lib/pin-urls";

const FILE = path.join(process.cwd(), "content", "pins.json");

export function getPins(): Pin[] {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// --- выгрузка (только для scripts/sync-pinterest.ts) ----------------------

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type RawPin = {
  id: string;
  dominant_color?: string;
  images?: Record<string, { url: string; width: number; height: number }>;
};

function toPin(p: RawPin): Pin | null {
  const big = p.images?.["736x"] ?? p.images?.["474x"];
  const m = big?.url.match(/^https:\/\/i\.pinimg\.com\/[^/]+\/(.+)$/);
  if (!big || !m) return null;
  return {
    id: p.id,
    img: m[1],
    w: big.width,
    h: big.height,
    ...(p.dominant_color ? { color: p.dominant_color } : {}),
  };
}

/** Все сохранённые пины профиля, от новых к старым. */
export async function fetchAllPins(): Promise<Pin[]> {
  const profile = `https://www.pinterest.com/${PINTEREST_USER}/`;
  const home = await fetch(profile, { headers: { "user-agent": UA } });
  const cookies = home.headers.getSetCookie().map((c) => c.split(";")[0]);
  const csrf = cookies.find((c) => c.startsWith("csrftoken="))?.split("=")[1];
  if (!csrf) throw new Error("Pinterest не выдал csrftoken");

  const headers = {
    "user-agent": UA,
    cookie: cookies.join("; "),
    "x-csrftoken": csrf,
    "x-requested-with": "XMLHttpRequest",
    "x-pinterest-source-url": `/${PINTEREST_USER}/`,
    "x-pinterest-pws-handler": "www/[username].js",
    "x-pinterest-appstate": "active",
    accept: "application/json",
    referer: profile,
  };

  const pins: Pin[] = [];
  const seen = new Set<string>();
  let bookmark: string | undefined;
  // Страница — 25 пинов (бо́льший page_size эндпоинт отвергает).
  for (let page = 0; page < 400; page++) {
    const options = {
      username: PINTEREST_USER,
      page_size: 25,
      ...(bookmark ? { bookmarks: [bookmark] } : {}),
    };
    const q = new URLSearchParams({
      source_url: `/${PINTEREST_USER}/_created/`,
      data: JSON.stringify({ options, context: {} }),
    });
    const res = await fetch(
      `https://www.pinterest.com/resource/UserPinsResource/get/?${q}`,
      { headers }
    );
    const text = await res.text();
    if (!res.ok || !text.startsWith("{")) {
      throw new Error(`Pinterest: ${res.status} ${text.slice(0, 100)}`);
    }
    const rr = JSON.parse(text).resource_response;
    const data: RawPin[] = rr.data ?? [];
    for (const raw of data) {
      const pin = toPin(raw);
      if (pin && !seen.has(pin.id)) {
        seen.add(pin.id);
        pins.push(pin);
      }
    }
    bookmark = rr.bookmark;
    if (!bookmark || bookmark === "-end-" || data.length === 0) break;
  }
  return pins;
}
