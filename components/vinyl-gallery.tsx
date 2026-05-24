"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { hueOf, slugifyVinyl } from "@/lib/vinyl-utils";
import type { VinylAlbum } from "@/lib/vinyl";

const trackWord = (n: number) => {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "трек";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "трека";
  return "треков";
};

function VinylCard({
  title,
  subtitle,
  want = false,
}: {
  title: string;
  subtitle?: string;
  want?: boolean;
}) {
  const h = hueOf(title);
  return (
    <Link
      href={`/vinyl/${slugifyVinyl(title)}`}
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
      <div
        className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-md p-4 shadow-lg ring-1 ring-black/15"
        style={{
          background: `linear-gradient(150deg, hsl(${h} 58% 46%), hsl(${(h + 35) % 360} 52% 26%))`,
        }}
      >
        {/* блик */}
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
    </Link>
  );
}

export function VinylGallery({
  have,
  want,
}: {
  have: VinylAlbum[];
  want: string[];
}) {
  const [tab, setTab] = React.useState<"have" | "want">("have");
  const [query, setQuery] = React.useState("");

  const tabs = [
    { key: "have" as const, label: "Что у меня есть", count: have.length },
    { key: "want" as const, label: "Что я хочу", count: want.length },
  ];

  const q = query.trim().toLowerCase();
  const filteredHave = q
    ? have.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.tracks.some((t) => t.toLowerCase().includes(q))
      )
    : have;
  const filteredWant = q
    ? want.filter((w) => w.toLowerCase().includes(q))
    : want;

  const isEmpty =
    tab === "have" ? filteredHave.length === 0 : filteredWant.length === 0;

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

      {/* Сетка пластинок */}
      {isEmpty ? (
        <p className="mt-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Ничего не нашлось по запросу «{query.trim()}».
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {tab === "have"
            ? filteredHave.map((a) => (
                <VinylCard
                  key={a.title}
                  title={a.title}
                  subtitle={
                    a.tracks.length
                      ? `${a.tracks.length} ${trackWord(a.tracks.length)}`
                      : undefined
                  }
                />
              ))
            : filteredWant.map((w) => <VinylCard key={w} title={w} want />)}
        </div>
      )}
    </div>
  );
}
