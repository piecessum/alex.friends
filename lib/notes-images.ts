// Картинки лонгрида (в отличие от коротких постов, см. lib/editor-images.ts)
// коммитятся в репозиторий как настоящие webp-файлы в public/notes/ — тот же
// паттерн, что и у существующих заметок (scripts/optimize-notes-images.py),
// а не проксируются через Telegram file_id.

import sharp from "sharp";
import crypto from "node:crypto";
import type { PMNode } from "./editor-doc-walk";
import type { CommitFile } from "./github-commit";
import { dataUrlToBuffer } from "./editor-images";

async function toWebpFile(dataUrl: string): Promise<{ file: CommitFile; publicPath: string }> {
  const { buffer } = dataUrlToBuffer(dataUrl);
  const webp = await sharp(buffer).webp({ quality: 82 }).toBuffer();
  const name = crypto.randomBytes(10).toString("hex") + ".webp";
  return {
    file: { path: `public/notes/${name}`, content: webp.toString("base64"), encoding: "base64" },
    publicPath: `/notes/${name}`,
  };
}

/** Заменяет data URL картинок лонгрида на финальные /notes/<hash>.webp пути
 *  (сохраняя остальные атрибуты, в т.ч. width/height) и параллельно готовит
 *  файлы для одного общего коммита (см. lib/github-commit.ts). */
export async function convertNoteImages(
  doc: PMNode
): Promise<{ doc: PMNode; files: CommitFile[] }> {
  const files: CommitFile[] = [];

  async function walk(node: PMNode): Promise<PMNode> {
    if (node.type === "postImage" && typeof node.attrs?.dataUrl === "string") {
      const converted = await toWebpFile(node.attrs.dataUrl);
      files.push(converted.file);
      return { ...node, attrs: { ...node.attrs, dataUrl: converted.publicPath } };
    }
    if (node.type === "gallery" && Array.isArray(node.attrs?.items)) {
      const items = await Promise.all(
        (node.attrs.items as { dataUrl: string; width?: number; height?: number }[]).map(
          async (item) => {
            const converted = await toWebpFile(item.dataUrl);
            files.push(converted.file);
            return { ...item, dataUrl: converted.publicPath };
          }
        )
      );
      return { ...node, attrs: { ...node.attrs, items } };
    }
    if (node.content) {
      return { ...node, content: await Promise.all(node.content.map(walk)) };
    }
    return node;
  }

  const content = await Promise.all((doc.content ?? []).map(walk));
  return { doc: { ...doc, content }, files };
}
