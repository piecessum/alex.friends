"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { hueOf } from "@/lib/vinyl-utils";

/**
 * Квадрат с лицевой обложкой и оборотом (сама пластинка).
 * Листается свайпом (scroll-snap) — на мобильном пальцем, на десктопе мышью/тачпадом.
 */
export function VinylFlip({ title, want }: { title: string; want?: boolean }) {
  const h = hueOf(title);
  const ref = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-2xl shadow-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Лицевая обложка */}
        <div
          className="relative flex aspect-square w-full shrink-0 snap-center flex-col justify-between overflow-hidden p-6"
          style={{
            background: `linear-gradient(150deg, hsl(${h} 58% 46%), hsl(${(h + 35) % 360} 52% 26%))`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_-10%_-10%,rgba(255,255,255,0.18),transparent_55%)]" />
          <span className="relative text-xs font-semibold uppercase tracking-widest text-white/55">
            {want ? "хочу" : "винил"}
          </span>
          <div className="relative text-2xl font-bold leading-tight text-white drop-shadow-sm sm:text-3xl">
            {title}
          </div>
        </div>

        {/* Оборот — сама пластинка */}
        <div className="relative flex aspect-square w-full shrink-0 snap-center items-center justify-center overflow-hidden bg-neutral-900">
          <div
            className="relative aspect-square w-[92%] rounded-full bg-neutral-950 shadow-2xl"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 50% 50%, #0a0a0a 0px, #0a0a0a 1px, #1d1d1d 2.5px, #0a0a0a 4px)",
            }}
          >
            <div
              className="absolute left-1/2 top-1/2 flex h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-2 text-center text-[10px] font-semibold leading-tight text-white/90"
              style={{ background: `hsl(${h} 62% 48%)` }}
            >
              <span className="line-clamp-3">{title}</span>
            </div>
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900 ring-2 ring-black/30" />
          </div>
        </div>
      </div>

      {/* Точки-индикатор */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition",
              active === i
                ? "bg-neutral-800 dark:bg-neutral-200"
                : "bg-neutral-300 dark:bg-neutral-700"
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-center text-xs text-neutral-400 dark:text-neutral-500">
        {active === 0 ? "листай вправо — там оборот" : "лицевая ← листай влево"}
      </p>
    </div>
  );
}
