import type { TgPost } from "./telegram";

/** Весь текст поста для превью/поиска/статистики: твой комментарий + текст
 *  форварда (или просто текст обычного поста). Отдельный модуль без node:fs,
 *  чтобы его можно было импортировать и в клиентские компоненты. */
export function postBody(p: TgPost): string {
  return [p.comment, p.html, p.poll?.question].filter(Boolean).join("\n\n");
}

/**
 * Хэштеги в тексте поста — ссылки Telegram на поиск (`?q=%23тег` или
 * t.me/s/<канал>?q=%23тег). Ведём их на /notes?tag=тег в том же окне —
 * там сразу включается фильтр по этому тегу.
 */
export function internalizeHashtagLinks(html: string): string {
  return html.replace(
    /<a\b[^>]*\bhref="(?:https?:\/\/t\.me\/s\/[^"?]+)?\?q=%23([^"&]+)"[^>]*>/gi,
    (full, raw) => {
      try {
        const tag = decodeURIComponent(raw).toLowerCase();
        return `<a href="/notes?tag=${encodeURIComponent(tag)}">`;
      } catch {
        return full;
      }
    }
  );
}
