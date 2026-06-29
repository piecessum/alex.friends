"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import { TagGraph } from "@/components/tag-graph";
import type { TagGraph as TagGraphData } from "@/lib/graph";

// Превью графа в правом верхнем углу (как граф-уголок в Obsidian-сайтах).
// Только десктоп, не интерактивный — клик открывает общий граф (в статистике).
// На странице поста сюда приходит локальный граф с подсвеченным узлом.
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
    <Link
      href="/notes/stats"
      aria-label="Открыть граф связей"
      title="Граф связей"
      className="group fixed top-24 right-6 z-40 hidden h-44 w-60 overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/60 shadow-lg shadow-black/5 backdrop-blur-md transition hover:border-indigo-400/70 dark:border-neutral-800/70 dark:bg-neutral-950/50 dark:hover:border-indigo-500/60 lg:block"
    >
      <TagGraph
        data={data}
        interactive={false}
        tagLabels={tagLabels}
        className="h-full w-full"
      />
      <span className="pointer-events-none absolute bottom-2 left-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition group-hover:text-indigo-600 dark:text-neutral-400 dark:group-hover:text-indigo-400">
        <Share2 className="h-3.5 w-3.5" />
        {caption}
      </span>
    </Link>
  );
}
