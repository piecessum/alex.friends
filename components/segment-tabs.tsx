"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type SegmentTab = { key: string; label: string; href: string; count?: number };

/**
 * Сегментированный переключатель между страницами раздела («для себя / для
 * работы», «Пины / Фоткаю»). Вкладки — ссылки на отдельные статические
 * страницы, а не состояние, чтобы вкладкой можно было поделиться. Вид — как
 * «Что у меня есть / Что я хочу» на странице пластинок.
 *
 * Вкладка переключается сразу по клику, не дожидаясь новой страницы. Пока та
 * грузится, содержимое старой прячется (правило [data-segment-pending] в
 * globals.css), а под шапкой — скелетон-сетка.
 */
export function SegmentTabs({ tabs, active }: { tabs: SegmentTab[]; active: string }) {
  const [pending, setPending] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // Пришла новая страница (или вернулись назад) — ожидание закончилось.
  useEffect(() => setPending(null), [active]);

  // Скелетон кладём в тот блок <main>, где стоят вкладки, — в его отступы.
  useEffect(() => {
    let el: HTMLElement | null = navRef.current;
    while (el?.parentElement && el.parentElement.tagName !== "MAIN") el = el.parentElement;
    setSlot(el?.parentElement ? el : null);
  }, []);

  const current = pending ?? active;

  return (
    <>
      <nav
        ref={navRef}
        data-segment-pending={pending ? "" : undefined}
        className="inline-flex w-fit rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-950"
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              setPending(t.key === active ? null : t.key);
            }}
            aria-current={t.key === current ? "page" : undefined}
            className={cn(
              "rounded-xl px-4 py-2 text-ui font-medium whitespace-nowrap",
              t.key === current
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="opacity-50"> {t.count}</span>}
          </Link>
        ))}
      </nav>
      {pending && slot && createPortal(<SegmentSkeleton />, slot)}
    </>
  );
}

/** Заглушка на время загрузки: карточки сетки с мягким переливом. */
function SegmentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загружаю" className="mt-8 grid w-full basis-full gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800"
        >
          <div className="segment-shimmer aspect-[3/2] w-full" style={{ animationDelay: `${i * 90}ms` }} />
          <div className="space-y-2.5 p-5">
            <div className="segment-shimmer h-3 w-1/3 rounded-full" style={{ animationDelay: `${i * 90}ms` }} />
            <div className="segment-shimmer h-4 w-5/6 rounded-full" style={{ animationDelay: `${i * 90}ms` }} />
            <div className="segment-shimmer h-4 w-2/3 rounded-full" style={{ animationDelay: `${i * 90}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
