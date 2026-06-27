"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Гифки ~1.44 с, проигрываются один раз (loop=1) и держат последний кадр.
 * Статичные day.PNG / night.PNG — это первый и последний кадр гифки,
 * поэтому подмена гифки на статику происходит пиксель-в-пиксель, без рывка.
 */
const ANIM_MS = 1500;

const ASSETS = {
  /** Светлая тема — в очках (первый кадр гифки) */
  light: "/avatar/day.PNG",
  /** Тёмная тема — без очков (последний кадр гифки) */
  dark: "/avatar/night.PNG",
  /** Переход свет→тьма — снимает очки */
  toDark: "/avatar/day-night.gif",
  /** Переход тьма→свет — надевает очки */
  toLight: "/avatar/night-day.gif",
} as const;

export function AvatarToggle({
  size = 80,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [broken, setBroken] = React.useState(false);
  const [src, setSrc] = React.useState<string>(ASSETS.dark);

  const prevTheme = React.useRef<string | undefined>(undefined);
  const blobs = React.useRef<Record<string, Blob>>({});
  const liveUrl = React.useRef<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionId = React.useRef(0);

  // Гифки один раз грузим целиком в память. Дальше каждый переход создаёт
  // свежий object-URL из блоба: гифка играет с первого кадра и не качается
  // по сети повторно.
  React.useEffect(() => {
    setMounted(true);
    prevTheme.current = resolvedTheme;
    setSrc(resolvedTheme === "dark" ? ASSETS.dark : ASSETS.light);
    let alive = true;

    [ASSETS.toDark, ASSETS.toLight].forEach((url) => {
      fetch(url)
        .then((r) => r.blob())
        .then((b) => {
          if (alive) blobs.current[url] = b;
        })
        .catch(() => {});
    });
    // Статичные кадры — в кэш браузера.
    [ASSETS.light, ASSETS.dark].forEach((s) => {
      const i = new Image();
      i.src = s;
    });

    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Смена темы → проигрываем нужную гифку.
  React.useEffect(() => {
    if (!mounted || !resolvedTheme) return;
    if (!prevTheme.current || prevTheme.current === resolvedTheme) {
      prevTheme.current = resolvedTheme;
      setSrc(resolvedTheme === "dark" ? ASSETS.dark : ASSETS.light);
      return;
    }

    const toDark = resolvedTheme === "dark";
    prevTheme.current = resolvedTheme;

    const url = toDark ? ASSETS.toDark : ASSETS.toLight;
    const final = toDark ? ASSETS.dark : ASSETS.light;

    if (timer.current) clearTimeout(timer.current);
    const id = ++transitionId.current;

    const play = (blob: Blob) => {
      if (transitionId.current !== id) return;
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
      const gif = URL.createObjectURL(blob);
      liveUrl.current = gif;
      setSrc(gif);

      timer.current = setTimeout(() => {
        if (transitionId.current !== id) return;
        setSrc(final);
      }, ANIM_MS);
    };

    const cached = blobs.current[url];
    if (cached) {
      play(cached);
      return;
    }

    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        blobs.current[url] = blob;
        play(blob);
      })
      .catch(() => {
        if (transitionId.current === id) setSrc(final);
      });
  }, [resolvedTheme, mounted]);

  const ring =
    "ring-2 ring-neutral-200 dark:ring-neutral-800 shadow-lg shadow-black/5";

  if (broken) {
    // Фолбэк, пока ассеты не добавлены: градиентный кружок с инициалами.
    return (
      <div
        aria-label="Аватар"
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 font-bold text-white",
          ring,
          className
        )}
      >
        АМ
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative overflow-hidden rounded-full", ring, className)}
    >
      {/* Один img исключает мигание между подложкой и GIF. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Аватар Алексея"
        draggable={false}
        onError={() => setBroken(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
