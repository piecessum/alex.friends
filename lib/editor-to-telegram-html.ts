import { escapeHtml, renderBlocks, type PMNode, type RenderTarget } from "./editor-doc-walk";

// Лимиты Bot API: подпись под фото/альбомом — 1024 символа, обычное
// сообщение — 4096 (как учитывает scripts/publish-telegram.mjs для анонсов).
export const CAPTION_LIMIT = 1024;
export const MESSAGE_LIMIT = 4096;

// Bot API разрешает слать <tg-emoji emoji-id="…"> только ботам с username,
// купленным на Fragment — для обычных ботов Telegram вернёт 400 Bad Request
// на весь текст. Пока это не подтверждено для нашего бота, кастомные эмодзи
// в отправляемый в Telegram текст уходят как обычный юникод-фолбэк; на сайте
// (docToPostHtml) ограничение не действует — там всегда настоящая картинка.
const TRY_TG_EMOJI_ENTITIES = false;

const target: RenderTarget = {
  renderEmoji: (id, fallback) =>
    TRY_TG_EMOJI_ENTITIES && id
      ? `<tg-emoji emoji-id="${id}">${escapeHtml(fallback)}</tg-emoji>`
      : escapeHtml(fallback),
  blockquoteAttr: (expandable) => (expandable ? ` expandable="expandable"` : ""),
};

export function docToTelegramHtml(
  doc: PMNode
): { text: string; overLimit: boolean; limit: number } {
  const text = renderBlocks(doc, target).join("\n\n").trim();
  return { text, overLimit: text.length > MESSAGE_LIMIT, limit: MESSAGE_LIMIT };
}
