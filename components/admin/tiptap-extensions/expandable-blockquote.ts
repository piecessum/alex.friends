import Blockquote from "@tiptap/extension-blockquote";

// Расширяет стандартную цитату атрибутом expandable — аналог Telegram-тега
// <blockquote expandable="expandable"> (длинная цитата, свёрнутая по
// умолчанию). В редакторе используется ВМЕСТО блокировки из StarterKit
// (см. StarterKit.configure({ blockquote: false }) в post-editor.tsx).

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    expandableBlockquote: {
      setBlockquoteExpandable: (expandable: boolean) => ReturnType;
    };
  }
}

export const ExpandableBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      expandable: {
        default: false,
        parseHTML: (el) => el.hasAttribute("expandable"),
        renderHTML: (attrs) =>
          attrs.expandable ? { expandable: "expandable" } : {},
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setBlockquoteExpandable:
        (expandable: boolean) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { expandable }),
    };
  },
});
