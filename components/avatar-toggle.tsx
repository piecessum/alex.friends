"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Длительность гиф-анимации (снимает/надевает очки) в мс.
 * Гифки ~1.44 с, проигрываются один раз (loop=1) и держат последний кадр —
 * свап на статичное фото происходит здесь с небольшим запасом.
 */
const ANIM_MS = 1600;

const ASSETS = {
  /** Светлая тема, статика — в очках (день) */
  light: "/avatar/day.PNG",
  /** Тёмная тема, статика — без очков (ночь) */
  dark: "/avatar/night.PNG",
  /** Переход свет→тьма — снимает очки (день→ночь) */
  toDark: "/avatar/day-night.gif",
  /** Переход тьма→свет — надевает очки (ночь→день) */
  toLight: "/avatar/night-day.gif",
} as const;

type Phase = "idle" | "to-dark" | "to-light";

export function AvatarToggle({
  size = 80,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [gifUrl, setGifUrl] = React.useState<string | null>(null);
  const [broken, setBroken] = React.useState(false);

  const prevTheme = React.useRef<string | undefined>(undefined);
  const blobs = React.useRef<{ toDark?: Blob; toLight?: Blob }>({});
  const objectUrl = React.useRef<string | null>(null);

  // Один раз грузим гифки целиком в память (Blob). При смене темы создаём
  // свежий object-URL из этого блоба: гифка играет с первого кадра, рисуется
  // мгновенно (она уже в памяти) и НИКОГДА не качается по сети повторно —
  // отсюда уходят и тормоза, и построчная «полоска» недогруженного кадра.
  React.useEffect(() => {
    setMounted(true);
    prevTheme.current = resolvedTheme;
    let alive = true;

    Promise.all([
      fetch(ASSETS.toDark).then((r) => r.blob()),
      fetch(ASSETS.toLight).then((r) => r.blob()),
    ])
      .then(([d, l]) => {
        if (!alive) return;
        blobs.current.toDark = d;
        blobs.current.toLight = l;
      })
      .catch(() => {});

    // Статичные кадры тоже прогреваем в кэш браузера.
    [ASSETS.light, ASSETS.dark].forEach((s) => {
      const i = new Image();
      i.src = s;
    });

    return () => {
      alive = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Смена темы (от любой кнопки) → проигрываем нужную гифку из памяти.
  React.useEffect(() => {
    if (!mounted || !resolvedTheme) return;
    if (!prevTheme.current || prevTheme.current === resolvedTheme) {
      prevTheme.current = resolvedTheme;
      return;
    }

    const toDark = resolvedTheme === "dark";
    prevTheme.current = resolvedTheme;

    const blob = toDark ? blobs.current.toDark : blobs.current.toLight;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);

    if (blob) {
      objectUrl.current = URL.createObjectURL(blob);
      setGifUrl(objectUrl.current);
    } else {
      // Блоб ещё не догрузился — фолбэк на прямой URL с cache-bust,
      // чтобы гифка хотя бы проиграла с первого кадра.
      objectUrl.current = null;
      const direct = toDark ? ASSETS.toDark : ASSETS.toLight;
      setGifUrl(`${direct}?k=${Date.now()}`);
    }

    setPhase(toDark ? "to-dark" : "to-light");
    const t = setTimeout(() => setPhase("idle"), ANIM_MS);
    return () => clearTimeout(t);
  }, [resolvedTheme, mounted]);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  const src =
    phase !== "idle" && gifUrl ? gifUrl : isDark ? ASSETS.dark : ASSETS.light;

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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt="Аватар Алексея"
      width={size}
      height={size}
      draggable={false}
      onError={() => setBroken(true)}
      style={{ width: size, height: size }}
      className={cn("rounded-full object-cover", ring, className)}
    />
  );
}
