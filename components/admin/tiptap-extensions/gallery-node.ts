import { Node } from "@tiptap/core";

// Галерея (2–10 картинок, лимит Bot API на sendMediaGroup) — превью в самом
// редакторе рисуется простой сеткой, все дети как data URL. На сайте это НЕ
// используется напрямую: при публикации фото уходят в Telegram альбомом
// (lib/editor-images.ts), а на странице поста рендерятся уже существующим
// components/post-media.tsx через поле TgPost.photos — эта нода нужна только
// как редакторский ввод.

export type GalleryItem = { dataUrl: string; width?: number; height?: number };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gallery: {
      insertGallery: (items: GalleryItem[]) => ReturnType;
    };
  }
}

export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      items: { default: [] as GalleryItem[] },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-gallery]" }];
  },

  renderHTML({ node }) {
    const items = (node.attrs.items ?? []) as GalleryItem[];
    return [
      "div",
      { "data-gallery": "", class: "grid grid-cols-3 gap-1" },
      ...items.map((it) => [
        "img",
        { src: it.dataUrl, class: "aspect-square rounded-md object-cover" },
      ]),
    ];
  },

  addCommands() {
    return {
      insertGallery:
        (items: GalleryItem[]) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { items } }),
    };
  },
});
