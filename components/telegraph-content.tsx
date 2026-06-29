"use client";

import * as React from "react";
import { FitImage } from "@/components/fit-image";
import { Lightbox } from "@/components/lightbox";
import type { NoteNode } from "@/lib/notes";

// Картинки лонгрида открываются в том же лайтбоксе, что и везде на сайте.
// Контекст даёт каждой <img> её индекс в общем списке снимков и обработчик
// открытия — клик по картинке открывает просмотр с нужного кадра.
type LightboxCtx = {
  indexOf: Map<NoteNode, number>;
  openAt: (i: number) => void;
};
const LightboxContext = React.createContext<LightboxCtx | null>(null);

/** Собирает src всех картинок по порядку и сопоставляет каждый <img>-узел с индексом. */
function collectImages(
  nodes: NoteNode[] | undefined,
  acc: { srcs: string[]; map: Map<NoteNode, number> }
): void {
  if (!nodes) return;
  for (const n of nodes) {
    if (typeof n === "string") continue;
    if (n.tag === "img") {
      const src = n.attrs?.src || "";
      if (src) {
        acc.map.set(n, acc.srcs.length);
        acc.srcs.push(src);
      }
    }
    collectImages(n.children, acc);
  }
}

/** Текст узла целиком — нужно, чтобы скрывать пустые подписи к картинкам. */
function textOf(nodes: NoteNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => (typeof n === "string" ? n : textOf(n.children)))
    .join("")
    .trim();
}

function renderNodes(nodes: NoteNode[] | undefined): React.ReactNode {
  if (!nodes) return null;
  return nodes.map((n, i) => <Node key={i} node={n} />);
}

function Node({ node }: { node: NoteNode }) {
  const ctx = React.useContext(LightboxContext);
  if (typeof node === "string") return <>{node}</>;

  const { tag, attrs = {}, children } = node;
  const kids = renderNodes(children);

  switch (tag) {
    case "p":
      return (
        <p className="my-5 leading-relaxed text-neutral-700 dark:text-neutral-300">
          {kids}
        </p>
      );
    case "h3":
      return (
        <h2 className="mt-10 mb-4 text-2xl font-bold tracking-tight">{kids}</h2>
      );
    case "h4":
      return <h3 className="mt-8 mb-3 text-xl font-semibold">{kids}</h3>;
    case "strong":
    case "b":
      return <strong className="font-semibold">{kids}</strong>;
    case "em":
    case "i":
      return <em>{kids}</em>;
    case "u":
      return <u>{kids}</u>;
    case "s":
      return <s>{kids}</s>;
    case "br":
      return <br />;
    case "hr":
      return <hr className="my-8 border-neutral-200 dark:border-neutral-800" />;
    case "a":
      return (
        <a
          href={attrs.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
        >
          {kids}
        </a>
      );
    case "blockquote":
      return (
        <blockquote className="my-6 border-l-2 border-indigo-400 pl-4 italic text-neutral-600 dark:text-neutral-400">
          {kids}
        </blockquote>
      );
    case "ul":
      return <ul className="my-5 list-disc space-y-1 pl-6">{kids}</ul>;
    case "ol":
      return <ol className="my-5 list-decimal space-y-1 pl-6">{kids}</ol>;
    case "li":
      return (
        <li className="text-neutral-700 dark:text-neutral-300">{kids}</li>
      );
    case "figure":
      return <figure className="my-7">{kids}</figure>;
    case "figcaption": {
      const caption = textOf(children);
      if (!caption) return null;
      return (
        <figcaption className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {kids}
        </figcaption>
      );
    }
    case "img": {
      const idx = ctx?.indexOf.get(node);
      const clickable = ctx != null && idx != null;
      return (
        <FitImage
          src={attrs.src || ""}
          alt={attrs.alt || ""}
          onClick={clickable ? () => ctx!.openAt(idx!) : undefined}
          className={`mx-auto h-auto rounded-xl border border-neutral-200 dark:border-neutral-800 ${
            clickable ? "cursor-zoom-in" : ""
          }`}
        />
      );
    }
    case "video":
      return (
        <video
          src={attrs.src}
          controls
          loop
          muted
          playsInline
          className="mx-auto h-auto w-full rounded-xl border border-neutral-200 dark:border-neutral-800"
        />
      );
    case "iframe":
      return (
        <span className="relative my-7 block aspect-video w-full overflow-hidden rounded-xl">
          <iframe
            src={attrs.src}
            title="Видео"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </span>
      );
    case "aside":
      return <aside className="my-6">{kids}</aside>;
    default:
      return <>{kids}</>;
  }
}

export function TelegraphContent({ content }: { content: NoteNode[] }) {
  const [open, setOpen] = React.useState<number | null>(null);

  const { srcs, indexOf } = React.useMemo(() => {
    const acc = { srcs: [] as string[], map: new Map<NoteNode, number>() };
    collectImages(content, acc);
    return { srcs: acc.srcs, indexOf: acc.map };
  }, [content]);

  const ctx = React.useMemo<LightboxCtx>(
    () => ({ indexOf, openAt: (i) => setOpen(i) }),
    [indexOf]
  );

  return (
    <LightboxContext.Provider value={ctx}>
      <div>{renderNodes(content)}</div>
      {open !== null && (
        <Lightbox items={srcs} startIndex={open} onClose={() => setOpen(null)} />
      )}
    </LightboxContext.Provider>
  );
}
