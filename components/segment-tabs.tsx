import Link from "next/link";
import { cn } from "@/lib/utils";

export type SegmentTab = { key: string; label: string; href: string; count?: number };

/**
 * Сегментированный переключатель между страницами раздела («для себя / для
 * работы», «Пины / Фоткаю»). Вкладки — ссылки на отдельные статические
 * страницы, а не состояние, чтобы вкладкой можно было поделиться. Вид — как
 * «Что у меня есть / Что я хочу» на странице пластинок.
 */
export function SegmentTabs({ tabs, active }: { tabs: SegmentTab[]; active: string }) {
  return (
    <nav className="inline-flex w-fit rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-950">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition",
            t.key === active
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="opacity-50"> {t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
