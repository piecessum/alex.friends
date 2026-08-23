import { Mark, mergeAttributes } from "@tiptap/core";

// Спойлер Telegram (<tg-spoiler>) — блюрится в превью поста, снимается по
// клику (см. components/spoiler-html.tsx, app/globals.css). Тег для парсинга
// и рендера совпадает с тем, что уже используется у скрейпленной ленты
// (lib/telegram.ts) и у docToPostHtml/docToTelegramHtml (lib/editor-doc-walk.ts).

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spoiler: {
      toggleSpoiler: () => ReturnType;
    };
  }
}

export const Spoiler = Mark.create({
  name: "spoiler",

  parseHTML() {
    return [{ tag: "tg-spoiler" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["tg-spoiler", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleSpoiler:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
