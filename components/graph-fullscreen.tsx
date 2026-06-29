"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TagGraph } from "@/components/tag-graph";
import type { TagGraph as TagGraphData } from "@/lib/graph";

// Полноэкранный просмотр графа оверлеем на всю страницу: подпись, крестик,
// Esc и блокировка прокрутки. Если передан fullData (общий граф) и в data есть
// фокус-узел (локальный граф поста) — появляется переключатель локальный/общий:
// на «общем» полный граф приглушён, а локальная часть подсвечена на своём месте.
export function GraphFullscreen({
  data,
  fullData,
  caption,
  onClose,
}: {
  data: TagGraphData;
  fullData?: TagGraphData;
  caption: string;
  onClose: () => void;
}) {
  const [view, setView] = React.useState<"local" | "full">("local");

  const focusId = React.useMemo(
    () => data.nodes.find((n) => n.focus)?.id,
    [data]
  );
  const localIds = React.useMemo(() => data.nodes.map((n) => n.id), [data]);
  const canToggle =
    !!fullData && !!focusId && fullData.nodes.some((n) => n.id === focusId);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Подпись локального таба — из caption («Этот пост в графе» → «Этот пост»).
  const localLabel = caption.replace(/\s*в графе$/i, "");

  const seg = "px-3.5 py-1 text-sm font-medium transition";
  const segOn = "bg-indigo-500 text-white";
  const segOff =
    "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:px-6">
        {/* Переключатель сам по себе говорит, что показано — отдельный заголовок не нужен. */}
        {canToggle ? (
          <div className="flex shrink-0 overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setView("local")}
              className={`${seg} ${view === "local" ? segOn : segOff}`}
            >
              {localLabel}
            </button>
            <button
              type="button"
              onClick={() => setView("full")}
              className={`${seg} ${view === "full" ? segOn : segOff}`}
            >
              Весь граф
            </button>
          </div>
        ) : (
          <span className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {caption}
          </span>
        )}

        <button
          type="button"
          onClick={onClose}
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
  );
}
