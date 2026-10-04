import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "self", label: "для себя", href: "/notes" },
  { key: "work", label: "для работы", href: "/notes/work" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Переключатель «для себя / для работы» рядом с заголовком «Пишу». Это две
 * отдельные статические страницы (/notes и /notes/work) — ссылка, а не
 * состояние, чтобы вкладкой можно было поделиться. Вид — тот же
 * сегментированный переключатель, что «Что у меня есть / Что я хочу» на
 * странице пластинок (components/vinyl-gallery.tsx).
 */
export function NotesTabs({
  active,
  counts,
}: {
  active: TabKey;
  counts: Record<TabKey, number>;
}) {
  return (
    <nav className="inline-flex w-fit rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-950">
      {TABS.map((t) => (
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
          {t.label} <span className="opacity-50">{counts[t.key]}</span>
        </Link>
      ))}
    </nav>
  );
}
