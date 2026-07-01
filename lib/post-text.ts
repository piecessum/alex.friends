import type { TgPost } from "./telegram";

/** Весь текст поста для превью/поиска/статистики: твой комментарий + текст
 *  форварда (или просто текст обычного поста). Отдельный модуль без node:fs,
 *  чтобы его можно было импортировать и в клиентские компоненты. */
export function postBody(p: TgPost): string {
  return [p.comment, p.html, p.poll?.question].filter(Boolean).join("\n\n");
}
