import Link from "next/link";

const TABS = [
  { key: "self", label: "для себя", href: "/notes" },
  { key: "work", label: "для работы", href: "/notes/work" },
] as const;

/**
 * Переключатель «для себя / для работы» рядом с заголовком «Пишу». Это две
 * отдельные статические страницы (/notes и /notes/work) — ссылка, а не
 * состояние, чтобы вкладкой можно было поделиться.
 */
export function NotesTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="inline-flex rounded-full border border-neutral-200 bg-white/60 p-1 dark:border-neutral-700 dark:bg-[#181818]/60">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              on
                ? "bg-indigo-500 text-white"
                : "text-neutral-600 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
