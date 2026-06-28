"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { hueOf } from "@/lib/vinyl-utils";
import type { VinylItem } from "@/lib/vinyl";

const trackWord = (n: number) => {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "трек";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "трека";
  return "треков";
};

// Состояние галереи (таб, поиск, позиция скролла), которое нужно
// восстановить при возврате со страницы конкретной пластинки.
const GALLERY_STATE_KEY = "vinyl-gallery-state";

function VinylCard({
  title,
  slug,
  cover,
  subtitle,
  want = false,
  onNavigate,
}: {
  title: string;
  slug: string;
  cover?: string;
  subtitle?: string;
  want?: boolean;
  onNavigate?: () => void;
}) {
  const h = hueOf(title);
  return (
    <Link
      href={`/vinyl/${slug}`}
      onClick={onNavigate}
      className="group relative block aspect-square transition hover:z-10"
    >
      {/* Пластинка выезжает вверх из конверта */}
      <div
        className="absolute left-1/2 top-0 aspect-square w-[86%] -translate-x-1/2 -translate-y-[12%] rounded-full bg-neutral-950 shadow-2xl transition-transform duration-300 ease-out group-hover:-translate-y-[26%]"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 50% 50%, #0a0a0a 0px, #0a0a0a 1px, #1d1d1d 2.5px, #0a0a0a 4px)",
        }}
        aria-hidden
      >
        <div
          className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `hsl(${h} 62% 48%)` }}
        >
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-950" />
        </div>
      </div>

      {/* Конверт поверх пластинки */}
      {cover ? (
        <div className="absolute inset-0 overflow-hidden rounded-md shadow-lg ring-1 ring-black/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {want && (
            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur">
              хочу
            </span>
          )}
        </div>
      ) : (
        <div
          className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-md p-4 shadow-lg ring-1 ring-black/15"
          style={{
            background: `linear-gradient(150deg, hsl(${h} 58% 46%), hsl(${(h + 35) % 360} 52% 26%))`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_-10%_-10%,rgba(255,255,255,0.18),transparent_55%)]" />
          <span className="relative text-[11px] font-semibold uppercase tracking-widest text-white/55">
            {want ? "хочу" : "винил"}
          </span>
          <div className="relative">
            <div className="text-base font-bold leading-tight text-white drop-shadow-sm sm:text-lg">
              {title}
            </div>
            {subtitle && (
              <div className="mt-1 text-xs text-white/70">{subtitle}</div>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

export function VinylGallery({
  have,
  want,
}: {
  have: VinylItem[];
  want: VinylItem[];
}) {
  const [tab, setTab] = React.useState<"have" | "want">("have");
  const [query, setQuery] = React.useState("");
  // null = «Все». Фильтр по жанру работает только на вкладке «есть».
  const [genre, setGenre] = React.useState<string | null>(null);

  // Лотки по жанрам, как в музыкальном магазине: каждый жанр и сколько
  // в нём пластинок. Сортируем по количеству (популярные жанры — первыми).
  const genres = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of have) {
      if (it.genre) counts.set(it.genre, (counts.get(it.genre) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
      .map(([name, count]) => ({ name, count }));
  }, [have]);

  // Возврат со страницы пластинки: восстанавливаем таб, поиск и скролл.
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(GALLERY_STATE_KEY);
      sessionStorage.removeItem(GALLERY_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        tab?: "have" | "want";
        query?: string;
        genre?: string | null;
        scrollY?: number;
      };
      if (saved.tab === "have" || saved.tab === "want") setTab(saved.tab);
      if (typeof saved.query === "string") setQuery(saved.query);
      if (typeof saved.genre === "string") setGenre(saved.genre);
      // Скроллим после отрисовки нужной вкладки. requestAnimationFrame
      // срабатывает даже если таб не изменился (возврат на дефолтный «have»),
      // когда ре-рендера от setTab не происходит.
      if (typeof saved.scrollY === "number") {
        const y = saved.scrollY;
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    } catch {
      /* sessionStorage недоступен — просто открываем галерею сверху */
    }
  }, []);

  const saveState = () => {
    try {
      sessionStorage.setItem(
        GALLERY_STATE_KEY,
        JSON.stringify({ tab, query, genre, scrollY: window.scrollY })
      );
    } catch {
      /* игнорируем — переход всё равно произойдёт */
    }
  };

  const tabs = [
    { key: "have" as const, label: "Что у меня есть", count: have.length },
    { key: "want" as const, label: "Что я хочу", count: want.length },
  ];

  const q = query.trim().toLowerCase();
  const match = (it: VinylItem) =>
    it.title.toLowerCase().includes(q) ||
    it.tracks.some((t) => t.toLowerCase().includes(q));

  const filteredHave = have.filter(
    (it) => (!genre || it.genre === genre) && (!q || match(it))
  );
  const filteredWant = q ? want.filter(match) : want;
  const list = tab === "have" ? filteredHave : filteredWant;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Сегментированный переключатель */}
        <div className="inline-flex w-fit rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition",
                tab === t.key
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              )}
            >
              {t.label} <span className="opacity-50">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Поиск */}
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию или треку"
            className="w-full rounded-xl border border-neutral-200 bg-white/60 py-2 pr-3 pl-9 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-indigo-400 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-200"
          />
        </div>
      </div>

      {/* Лотки по жанрам — как в магазине пластинок. Только на вкладке «есть». */}
      {tab === "have" && genres.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {[{ name: null as string | null, count: have.length }, ...genres].map(
            (g) => {
              const active = genre === g.name;
              return (
                <button
                  key={g.name ?? "__all"}
                  type="button"
                  onClick={() => setGenre(g.name)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-neutral-200 bg-white/60 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                  )}
                >
                  {g.name ?? "Все"}{" "}
                  <span className={active ? "opacity-60" : "opacity-50"}>
                    {g.count}
                  </span>
                </button>
              );
            }
          )}
        </div>
      )}

      {/* Сетка пластинок */}
      {list.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {q
            ? `Ничего не нашлось по запросу «${query.trim()}».`
            : "В этом жанре пока пусто."}
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {list.map((it) => (
            <VinylCard
              key={it.slug}
              title={it.title}
              slug={it.slug}
              cover={it.front}
              want={it.want}
              onNavigate={saveState}
              subtitle={
                !it.front && it.tracks.length
                  ? `${it.tracks.length} ${trackWord(it.tracks.length)}`
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
