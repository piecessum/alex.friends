"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { TagGraph } from "@/components/tag-graph";
import type { TagGraph as TagGraphData } from "@/lib/graph";

// Обёртка вокруг графа: рисует его внутри своего контейнера + кнопку
// «развернуть на весь экран». В развёрнутом виде граф показывается оверлеем
// на всю страницу с подписью (caption) и полным зумом/паном.
//
// Если передан fullData (общий граф) и в data есть фокус-узел (локальный граф
// поста), в полноэкранном виде появляется переключатель локальный/общий: на
// «общем» полный граф приглушён, а локальная часть подсвечена на своём месте —
// видно, где она находится в общем графе.
export function GraphFrame({
  data,
  fullData,
  caption = "Граф связей",
  inlineTagLabels = true,
  inlinePan = true,
  inlineHighlight = true,
}: {
  data: TagGraphData;
  fullData?: TagGraphData;
  /** Заголовок, видимый только в развёрнутом (полноэкранном) виде. */
  caption?: string;
  inlineTagLabels?: boolean;
  inlinePan?: boolean;
  inlineHighlight?: boolean;
}) {
  const [full, setFull] = React.useState(false);
  const [view, setView] = React.useState<"local" | "full">("local");

  // Фокус-узел локального графа и id его узлов — для режима «общий».
  const focusId = React.useMemo(
    () => data.nodes.find((n) => n.focus)?.id,
    [data]
  );
  const localIds = React.useMemo(() => data.nodes.map((n) => n.id), [data]);
  // Переключатель имеет смысл, только если есть общий граф и фокус в нём есть.
  const canToggle =
    !!fullData && !!focusId && fullData.nodes.some((n) => n.id === focusId);

  // Esc закрывает, прокрутку страницы под оверлеем блокируем.
  React.useEffect(() => {
    if (!full) return;
    setView("local"); // каждый разворот начинаем с локального вида
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

  const seg = "px-3 py-1 text-sm font-medium transition";
  const segOn = "bg-indigo-500 text-white";
  const segOff =
    "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200";

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
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:px-6">
              <span className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {canToggle && view === "full" ? "Граф связей" : caption}
              </span>

              {canToggle && (
                <div className="flex shrink-0 overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setView("local")}
                    className={`${seg} ${view === "local" ? segOn : segOff}`}
                  >
                    Локальный
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("full")}
                    className={`${seg} ${view === "full" ? segOn : segOff}`}
                  >
                    Общий
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setFull(false)}
                aria-label="Закрыть"
                title="Закрыть (Esc)"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:text-indigo-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-indigo-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex-1">
              {canToggle && view === "full" ? (
                <TagGraph
                  key="full"
                  data={fullData!}
                  interactive
                  pan
                  tagLabels
                  focusId={focusId}
                  emphasizeIds={localIds}
                  className="h-full w-full"
                />
              ) : (
                <TagGraph
                  key="local"
                  data={data}
                  interactive
                  pan
                  tagLabels
                  className="h-full w-full"
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
