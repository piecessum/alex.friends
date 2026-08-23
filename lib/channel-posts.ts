// Локальные короткие посты, заведённые через /admin — в отличие от
// content/notes/*.json (лонгриды) эти живут одним файлом-массивом, т.к.
// формат (TgPost) и объём те же, что у ленты из lib/telegram.ts.

import fs from "node:fs";
import path from "node:path";
import { fetchAllPosts, type TgPost } from "@/lib/telegram";

const FILE = path.join(process.cwd(), "content", "channel-posts.json");

export function getLocalChannelPosts(): TgPost[] {
  if (!fs.existsSync(FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Сериализованное содержимое файла для коммита (см. lib/github-commit.ts). */
export function serializeChannelPosts(posts: TgPost[]): string {
  return JSON.stringify(posts, null, 2) + "\n";
}

function allIds(p: TgPost): string[] {
  return [p.id, ...(p.aliasIds ?? [])];
}

/**
 * Сливает локальные посты (заведённые через /admin) со скрейпленными
 * (lib/telegram.ts, зеркало паблик-страницы канала). Публикация через бота
 * шлёт в тот же канал, так что рано или поздно скрейпер найдёт тот же
 * message_id — при совпадении побеждает локальная версия (не зависит от
 * разметки публичной HTML-страницы и токенов CDN), но `views` берём из
 * скрейпленной, если он там есть, а в локальной ещё нет (просмотры
 * появляются только со временем).
 */
export function mergeChannelFeed(local: TgPost[], scraped: TgPost[]): TgPost[] {
  const scrapedById = new Map<string, TgPost>();
  for (const p of scraped) for (const id of allIds(p)) scrapedById.set(id, p);

  const localIds = new Set(local.flatMap(allIds));

  const merged: TgPost[] = local.map((p) => {
    const dup = allIds(p)
      .map((id) => scrapedById.get(id))
      .find(Boolean);
    return dup?.views && !p.views ? { ...p, views: dup.views } : p;
  });

  for (const p of scraped) {
    if (allIds(p).some((id) => localIds.has(id))) continue;
    merged.push(p);
  }

  return merged.sort((a, b) => Number(b.id) - Number(a.id));
}

/** Лента для /notes и /channel/[id]: локальные посты + скрейпленный архив. */
export async function getFeedPosts(): Promise<TgPost[]> {
  return mergeChannelFeed(getLocalChannelPosts(), await fetchAllPosts());
}
