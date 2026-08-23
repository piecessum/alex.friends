import { Node, mergeAttributes } from "@tiptap/core";

// Кастомный эмодзи Telegram как inline-узел: хранит id (custom_emoji_id) и
// юникод-фолбэк. В редакторе (и на сайте, для docToPostHtml) рисуется
// картинкой через уже существующий прокси /api/tg-emoji/[id]
// (см. app/api/tg-emoji/[id]/route.ts, lib/telegram-emoji.ts) — тот же
// принцип, что и у кастомных эмодзи в скрейпленной ленте.

export type TelegramEmojiAttrs = { id: string; fallback: string };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    telegramEmoji: {
      insertTelegramEmoji: (attrs: TelegramEmojiAttrs) => ReturnType;
    };
  }
}

export const TelegramEmoji = Node.create({
  name: "telegramEmoji",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      fallback: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[data-tg-emoji-id]",
        getAttrs: (el) => ({
          id: (el as HTMLElement).getAttribute("data-tg-emoji-id"),
          fallback: (el as HTMLElement).getAttribute("alt") ?? "",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        "data-tg-emoji-id": node.attrs.id,
        src: `/api/tg-emoji/${node.attrs.id}`,
        alt: node.attrs.fallback,
        class: "emoji",
      }),
    ];
  },

  addCommands() {
    return {
      insertTelegramEmoji:
        (attrs: TelegramEmojiAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
