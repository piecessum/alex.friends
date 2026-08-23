import type { NoteNode } from "./notes";
import type { PMNode } from "./editor-doc-walk";

// Конвертер контента редактора в дерево NoteNode (content/notes/*.json,
// рендерит components/telegraph-content.tsx) — в отличие от
// editor-to-telegram-html/editor-to-post-html (плоский HTML-текст), тут
// целевая структура древовидная, поэтому общий editor-doc-walk.ts не
// переиспользуется, обход свой.
//
// tg-spoiler и кастомный эмодзи — Telegram-специфичные фичи, для лонгрида
// смысла не имеют: спойлер-марка тут просто игнорируется (текст остаётся
// обычным), кастомный эмодзи заменяется юникод-фолбэком.

function wrapMark(child: NoteNode, tag: string, attrs?: Record<string, string>): NoteNode {
  return attrs ? { tag, attrs, children: [child] } : { tag, children: [child] };
}

function renderTextNode(node: PMNode): NoteNode {
  let out: NoteNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        out = wrapMark(out, "strong");
        break;
      case "italic":
        out = wrapMark(out, "em");
        break;
      case "underline":
        out = wrapMark(out, "u");
        break;
      case "strike":
        out = wrapMark(out, "s");
        break;
      case "code":
        out = wrapMark(out, "code");
        break;
      case "link":
        out = wrapMark(out, "a", { href: String(mark.attrs?.href ?? "") });
        break;
      // spoiler — намеренно пропускаем, см. комментарий выше
    }
  }
  return out;
}

function renderInlineChildren(nodes: PMNode[] | undefined): NoteNode[] {
  const out: NoteNode[] = [];
  for (const n of nodes ?? []) {
    if (n.type === "text") out.push(renderTextNode(n));
    else if (n.type === "hardBreak") out.push({ tag: "br" });
    else if (n.type === "telegramEmoji") out.push(String(n.attrs?.fallback ?? ""));
  }
  return out;
}

function renderListItem(li: PMNode): NoteNode {
  const firstPara = (li.content ?? []).find((n) => n.type === "paragraph");
  return { tag: "li", children: renderInlineChildren(firstPara?.content) };
}

function renderBlock(node: PMNode): NoteNode[] {
  switch (node.type) {
    case "paragraph":
      return [{ tag: "p", children: renderInlineChildren(node.content) }];
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      return [{ tag: level <= 3 ? "h3" : "h4", children: renderInlineChildren(node.content) }];
    }
    case "blockquote":
      return [{ tag: "blockquote", children: (node.content ?? []).flatMap(renderBlock) }];
    case "codeBlock": {
      const code = (node.content ?? []).map((n) => n.text ?? "").join("");
      return [{ tag: "pre", children: [code] }];
    }
    case "bulletList":
      return [{ tag: "ul", children: (node.content ?? []).map(renderListItem) }];
    case "orderedList":
      return [{ tag: "ol", children: (node.content ?? []).map(renderListItem) }];
    case "horizontalRule":
      return [{ tag: "hr" }];
    case "postImage": {
      const src = String(node.attrs?.dataUrl ?? "");
      const alt = String(node.attrs?.alt ?? "");
      const width = node.attrs?.width ? String(node.attrs.width) : undefined;
      const height = node.attrs?.height ? String(node.attrs.height) : undefined;
      const children: NoteNode[] = [
        { tag: "img", attrs: { src, ...(width && height ? { width, height } : {}) } },
      ];
      if (alt) children.push({ tag: "figcaption", children: [alt] });
      return [{ tag: "figure", children }];
    }
    case "gallery": {
      const items = (node.attrs?.items ?? []) as { dataUrl: string }[];
      return items.map((it) => ({
        tag: "figure",
        children: [{ tag: "img", attrs: { src: it.dataUrl } }],
      }));
    }
    default:
      return (node.content ?? []).flatMap(renderBlock);
  }
}

export function docToNoteNodes(doc: PMNode): NoteNode[] {
  return (doc.content ?? []).flatMap(renderBlock);
}
