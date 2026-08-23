// Общий обход Tiptap/ProseMirror JSON-документа для текстовых форматов,
// которые используют один и тот же плоский алфавит тегов — HTML для Bot API
// (lib/editor-to-telegram-html.ts) и HTML короткого поста на сайте
// (lib/editor-to-post-html.ts), см. ALLOWED в lib/telegram.ts. У лонгридов
// другая (древовидная) целевая структура — свой конвертер,
// lib/editor-to-notenodes.ts, этот модуль не использует.
//
// Кастомный эмодзи и «раскрывающаяся» цитата рендерятся по-разному для
// Telegram (Bot API) и для сайта — это единственные два места, которые
// параметризуются через RenderTarget, остальной алфавит тегов общий.

export type PMMark = { type: string; attrs?: Record<string, unknown> };
export type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: PMMark[];
};

export type RenderTarget = {
  /** Узел telegramEmoji (components/admin/tiptap-extensions/telegram-emoji-node.ts). */
  renderEmoji: (id: string, fallback: string) => string;
  /** Атрибут(ы) у <blockquote>, если она expandable (пустая строка — если нет). */
  blockquoteAttr: (expandable: boolean) => string;
};

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MARK_TAGS: Record<string, string> = {
  bold: "b",
  italic: "i",
  underline: "u",
  strike: "s",
  code: "code",
  spoiler: "tg-spoiler",
};

function renderMarks(inner: string, marks: PMMark[] | undefined): string {
  if (!marks?.length) return inner;
  let out = inner;
  for (const mark of marks) {
    if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "");
      out = `<a href="${escapeHtml(href)}">${out}</a>`;
      continue;
    }
    const tag = MARK_TAGS[mark.type];
    if (tag) out = `<${tag}>${out}</${tag}>`;
  }
  return out;
}

function renderInline(node: PMNode, target: RenderTarget): string {
  if (node.type === "text") {
    return renderMarks(escapeHtml(node.text ?? ""), node.marks);
  }
  if (node.type === "hardBreak") return "\n";
  if (node.type === "telegramEmoji") {
    return target.renderEmoji(
      String(node.attrs?.id ?? ""),
      String(node.attrs?.fallback ?? "")
    );
  }
  return (node.content ?? []).map((n) => renderInline(n, target)).join("");
}

function renderBlock(node: PMNode, target: RenderTarget): string {
  switch (node.type) {
    case "paragraph":
      return (node.content ?? []).map((n) => renderInline(n, target)).join("");
    case "heading":
      // Telegram не поддерживает настоящие заголовки — визуально имитируем жирным.
      return `<b>${(node.content ?? [])
        .map((n) => renderInline(n, target))
        .join("")}</b>`;
    case "blockquote": {
      const attr = target.blockquoteAttr(Boolean(node.attrs?.expandable));
      return `<blockquote${attr}>${(node.content ?? [])
        .map((n) => renderBlock(n, target))
        .filter(Boolean)
        .join("\n")}</blockquote>`;
    }
    case "codeBlock": {
      const lang = node.attrs?.language ? String(node.attrs.language) : "";
      const code = (node.content ?? []).map((n) => n.text ?? "").join("");
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      return `<pre><code${cls}>${escapeHtml(code)}</code></pre>`;
    }
    case "bulletList":
    case "orderedList":
      return (node.content ?? [])
        .map(
          (li) =>
            "— " + (li.content ?? []).map((n) => renderBlock(n, target)).join("")
        )
        .join("\n");
    case "horizontalRule":
      return "───";
    default:
      return (node.content ?? [])
        .map((n) => renderBlock(n, target))
        .filter(Boolean)
        .join("\n");
  }
}

/** Блоки документа как отдельные строки (без склейки — разделитель и лимиты
 *  длины решает вызывающий код: у Telegram и у сайта они разные). */
export function renderBlocks(doc: PMNode, target: RenderTarget): string[] {
  return (doc.content ?? [])
    .map((n) => renderBlock(n, target))
    .filter((b) => b.trim().length > 0);
}
