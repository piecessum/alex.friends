import { GraphFrame } from "@/components/graph-frame";
import type { TagGraph as TagGraphData } from "@/lib/graph";

// Граф-уголок в правом верхнем углу (как граф-уголок в Obsidian-сайтах).
// Только десктоп. Граф интерактивный (ховер + клик по узлам, без зума/пана),
// а по кнопке в углу разворачивается на весь экран. Подпись (caption) видна
// только в развёрнутом виде.
export function GraphWidget({
  data,
  fullData,
  caption = "Граф связей",
  tagLabels = false,
}: {
  data: TagGraphData;
  /** Общий граф — для переключателя локальный/общий в полноэкранном виде. */
  fullData?: TagGraphData;
  caption?: string;
  tagLabels?: boolean;
}) {
  return (
    <div className="fixed top-24 right-6 z-40 hidden h-44 w-60 overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/60 shadow-lg shadow-black/5 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/50 lg:block">
      <GraphFrame
        data={data}
        fullData={fullData}
        caption={caption}
        inlineTagLabels={tagLabels}
        inlinePan={false}
        inlineHighlight={false}
      />
    </div>
  );
}
