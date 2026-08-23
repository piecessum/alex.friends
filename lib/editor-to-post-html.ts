import { escapeHtml, renderBlocks, type PMNode, type RenderTarget } from "./editor-doc-walk";

// Ровно то, что ляжет в TgPost.html локального поста и уйдёт в
// SpoilerHtml/ChannelPost без изменений. Кастомный эмодзи здесь сразу
// рендерится настоящей картинкой (через уже существующий прокси
// /api/tg-emoji/<id>) — в отличие от отправки в Telegram, тут нет
// Fragment-ограничения Bot API, это просто чтение.
const target: RenderTarget = {
  renderEmoji: (id, fallback) =>
    id
      ? `<img class="emoji" src="/api/tg-emoji/${id}" alt="${escapeHtml(fallback)}">`
      : escapeHtml(fallback),
  blockquoteAttr: (expandable) => (expandable ? ` data-expandable="1"` : ""),
};

export function docToPostHtml(doc: PMNode): string {
  return renderBlocks(doc, target).join("\n\n").trim();
}
