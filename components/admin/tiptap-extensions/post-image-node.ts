import { Node, mergeAttributes } from "@tiptap/core";

// Одиночная картинка в редакторе — хранит уже сжатый data URL (см.
// components/admin/image-compress.ts), чтобы не таскать сырые файлы через
// JSON-документ и не раздувать тело запроса публикации. При публикации
// (lib/editor-images.ts) уходит в Telegram как sendPhoto, а не в текст поста —
// как и у скрейпленных постов, фото поста живёт отдельным полем `photos`,
// не инлайном в HTML.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    postImage: {
      insertPostImage: (attrs: {
        dataUrl: string;
        alt?: string;
        width?: number;
        height?: number;
      }) => ReturnType;
    };
  }
}

export const PostImage = Node.create({
  name: "postImage",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      dataUrl: { default: null },
      alt: { default: "" },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[data-post-image]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        "data-post-image": "",
        src: node.attrs.dataUrl,
        alt: node.attrs.alt,
        class: "max-h-64 rounded-lg",
      }),
    ];
  },

  addCommands() {
    return {
      insertPostImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
