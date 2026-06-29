"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import { TagGraph } from "@/components/tag-graph";
import type { TagGraph as TagGraphData } from "@/lib/graph";

// Граф-уголок в правом верхнем углу (как граф-уголок в Obsidian-сайтах).
// Только десктоп. Сам граф интерактивный: наведение показывает название,
// клик по узлу ведёт к посту/тегу (но без зума и пана — чтобы не мешать
// прокрутке страницы). Подпись внизу — ссылка на общий граф в статистике.
export function GraphWidget({
  data,
  caption = "Граф связей",
  tagLabels = false,
}: {
  data: TagGraphData;
  caption?: string;
  tagLabels?: boolean;
}) {
  return (
    <div className="group fixed top-24 right-6 z-40 hidden h-44 w-60 overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/60 shadow-lg shadow-black/5 backdrop-blur-md transition hover:border-indigo-400/70 dark:border-neutral-800/70 dark:bg-neutral-950/50 dark:hover:border-indigo-500/60 lg:block">
      <TagGraph
        data={data}
        interactive
        pan={false}
        tagLabels={tagLabels}
        className="h-full w-full"
      />
      <Link
        href="/notes/stats"
        title="Открыть общий граф"
        className="absolute bottom-2 left-3 inline-flex items-center gap-1.5 rounded-md bg-white/70 px-1.5 py-0.5 text-xs font-medium text-neutral-500 backdrop-blur transition hover:text-indigo-600 dark:bg-neutral-950/60 dark:text-neutral-400 dark:hover:text-indigo-400"
      >
        <Share2 className="h-3.5 w-3.5" />
        {caption}
      </Link>
    </div>
  );
}
