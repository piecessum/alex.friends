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
  // Активный переход: гифка поверх + кадр-«подложка» под ней. null = покой.
  const [trans, setTrans] = React.useState<{ gif: string; base: string } | null>(
    null
  );

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
      return;
    }

    const toDark = resolvedTheme === "dark";
    prevTheme.current = resolvedTheme;

    const url = toDark ? ASSETS.toDark : ASSETS.toLight;
    const blob = blobs.current[url];

    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    const gif = blob
      ? (liveUrl.current = URL.createObjectURL(blob))
      : ((liveUrl.current = null), `${url}?k=${Date.now()}`);

    // Подложка во время анимации = стартовый кадр: без мигания в финальное фото.
    const base = toDark ? ASSETS.light : ASSETS.dark;
    setTrans({ gif, base });

    if (timer.current) clearTimeout(timer.current);
    const id = ++transitionId.current;
    timer.current = setTimeout(() => {
      if (transitionId.current === id) setTrans(null);
    }, ANIM_MS);
  }, [resolvedTheme, mounted]);

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const base = trans ? trans.base : isDark ? ASSETS.dark : ASSETS.light;

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
      {/* Статичный кадр — всегда снизу, никогда не мигает. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={base}
        alt="Аватар Алексея"
        draggable={false}
        onError={() => setBroken(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Гифка — только во время перехода, поверх статики. */}
      {trans && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={trans.gif}
          src={trans.gif}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
