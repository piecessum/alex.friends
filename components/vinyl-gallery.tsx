"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { VinylAlbum } from "@/lib/vinyl";

/** Стабильный «цвет обложки» из названия. */
function hueOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

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
    <div className="group relative aspect-square transition hover:z-10">
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
    </div>
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

  const tabs = [
    { key: "have" as const, label: "Что у меня есть", count: have.length },
    { key: "want" as const, label: "Что я хочу", count: want.length },
  ];

  return (
    <div>
      {/* Сегментированный переключатель */}
      <div className="inline-flex rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
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

      {/* Сетка пластинок */}
      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {tab === "have"
          ? have.map((a) => (
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
          : want.map((w) => <VinylCard key={w} title={w} want />)}
      </div>
    </div>
  );
}
