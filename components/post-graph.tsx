"use client";

import * as React from "react";
import { Maximize2, Share2 } from "lucide-react";
import { TagGraph } from "@/components/tag-graph";
import { GraphFullscreen } from "@/components/graph-fullscreen";
import type { TagGraph as TagGraphData } from "@/lib/graph";

// Граф поста/лонгрида с двумя входами в один полноэкранный просмотр:
//  • десктоп — граф-уголок справа вверху (как в Obsidian) с кнопкой разворота;
//  • мобильный — кнопка «Граф» в одном ряду с «Назад».
// Данные приходят один раз, состояние разворота общее.
export function PostGraph({
  data,
  fullData,
  caption,
}: {
  data: TagGraphData;
  fullData?: TagGraphData;
  caption: string;
}) {
  const [full, setFull] = React.useState(false);

  return (
    <>
      {/* Мобильная кнопка «Граф» — в ряду с «Назад» */}
      <button
        type="button"
        onClick={() => setFull(true)}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 lg:hidden"
      >
        <Share2 className="h-4 w-4" />
        Граф
      </button>

      {/* Десктоп: граф-уголок с локальным графом и кнопкой разворота */}
      <div className="fixed top-24 right-6 z-40 hidden h-44 w-60 overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/60 shadow-lg shadow-black/5 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/50 lg:block">
        <div className="relative h-full w-full">
          <TagGraph
            data={data}
            interactive
            pan={false}
            tagLabels={false}
            highlight={false}
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
        </div>
      </div>

      {full && (
        <GraphFullscreen
          data={data}
          fullData={fullData}
          caption={caption}
          onClose={() => setFull(false)}
        />
      )}
    </>
  );
}
