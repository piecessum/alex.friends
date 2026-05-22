"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Длительность гиф-анимации (снимает/надевает очки) в мс.
 * Гифки оптимизированы: ~1.5 с, проигрываются один раз и держат последний
 * кадр — свап на статичное фото происходит здесь с небольшим запасом.
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
  const [animKey, setAnimKey] = React.useState(0);
  const [broken, setBroken] = React.useState(false);
  const prevTheme = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    setMounted(true);
    prevTheme.current = resolvedTheme;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Следим за сменой темы (от любой кнопки) и проигрываем гифку один раз.
  React.useEffect(() => {
    if (!mounted || !resolvedTheme) return;
    if (prevTheme.current && prevTheme.current !== resolvedTheme) {
      setPhase(resolvedTheme === "dark" ? "to-dark" : "to-light");
      setAnimKey((k) => k + 1); // cache-bust, чтобы гифка играла с первого кадра
      prevTheme.current = resolvedTheme;
      const t = setTimeout(() => setPhase("idle"), ANIM_MS);
      return () => clearTimeout(t);
    }
    prevTheme.current = resolvedTheme;
  }, [resolvedTheme, mounted]);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  let src: string;
  if (phase === "to-dark") src = `${ASSETS.toDark}?k=${animKey}`;
  else if (phase === "to-light") src = `${ASSETS.toLight}?k=${animKey}`;
  else src = isDark ? ASSETS.dark : ASSETS.light;

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
      onError={() => setBroken(true)}
      style={{ width: size, height: size }}
      className={cn("rounded-full object-cover", ring, className)}
    />
  );
}
