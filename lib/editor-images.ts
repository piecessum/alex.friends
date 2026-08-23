import type { PMNode } from "./editor-doc-walk";

export type ExtractedImage = { dataUrl: string };

/** Картинки поста (postImage/gallery, см. components/admin/tiptap-extensions)
 *  в порядке появления в документе — они не часть текста (post.html), а
 *  отдельное поле TgPost.photos, как и у скрейпленных постов. */
export function extractImages(doc: PMNode): ExtractedImage[] {
  const out: ExtractedImage[] = [];
  for (const node of doc.content ?? []) {
    if (node.type === "postImage" && node.attrs?.dataUrl) {
      out.push({ dataUrl: String(node.attrs.dataUrl) });
    } else if (node.type === "gallery" && Array.isArray(node.attrs?.items)) {
      for (const item of node.attrs.items as { dataUrl?: string }[]) {
        if (item?.dataUrl) out.push({ dataUrl: item.dataUrl });
      }
    }
  }
  return out;
}

export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string } {
  const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) throw new Error("Некорректный data URL картинки");
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  return { buffer: Buffer.from(m[2], "base64"), ext };
}
