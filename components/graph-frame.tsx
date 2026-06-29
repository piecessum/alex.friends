"use client";

import * as React from "react";
import { Maximize2 } from "lucide-react";
import { TagGraph } from "@/components/tag-graph";
import { GraphFullscreen } from "@/components/graph-fullscreen";
import type { TagGraph as TagGraphData } from "@/lib/graph";

// Обёртка вокруг графа: рисует его внутри своего контейнера + кнопку
// «развернуть на весь экран» (открывает GraphFullscreen). Используется на
// странице статистики для общего графа.
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

      {full && (
        <GraphFullscreen
          data={data}
          fullData={fullData}
          caption={caption}
          onClose={() => setFull(false)}
        />
      )}
    </div>
  );
}
