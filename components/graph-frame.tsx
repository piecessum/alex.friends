"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { TagGraph } from "@/components/tag-graph";
import type { TagGraph as TagGraphData } from "@/lib/graph";

// Обёртка вокруг графа: рисует его внутри своего контейнера + кнопку
// «развернуть на весь экран». В развёрнутом виде граф показывается оверлеем
// на всю страницу с подписью (caption) и полным зумом/паном.
export function GraphFrame({
  data,
  caption = "Граф связей",
  inlineTagLabels = true,
  inlinePan = true,
  inlineHighlight = true,
}: {
  data: TagGraphData;
  /** Заголовок, видимый только в развёрнутом (полноэкранном) виде. */
  caption?: string;
  inlineTagLabels?: boolean;
  inlinePan?: boolean;
  inlineHighlight?: boolean;
}) {
  const [full, setFull] = React.useState(false);

  // Esc закрывает, прокрутку страницы под оверлеем блокируем.
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [full]);

  return (
    <div className="relative h-full w-full">
      <TagGraph
        data={data}
        interactive
        pan={inlinePan}
        tagLabels={inlineTagLabels}
        highlight={inlineHighlight}
        className="h-full w-full"
      />
      <button
        type="button"
        onClick={() => setFull(true)}
        aria-label="Развернуть граф на весь экран"
        title="Развернуть на весь экран"
        className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200/70 bg-white/70 text-neutral-500 backdrop-blur transition hover:text-indigo-600 dark:border-neutral-800/70 dark:bg-neutral-950/60 dark:text-neutral-400 dark:hover:text-indigo-400"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {full &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col bg-background">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:px-6">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {caption}
              </span>
              <button
                type="button"
                onClick={() => setFull(false)}
                aria-label="Закрыть"
                title="Закрыть (Esc)"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:text-indigo-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-indigo-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex-1">
              <TagGraph data={data} interactive pan tagLabels className="h-full w-full" />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
