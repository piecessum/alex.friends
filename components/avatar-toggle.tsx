"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const ANIM_MS = 1440;
const FRAME_COUNT = 36;
const FIRST_FRAME = 0;
const LAST_FRAME = FRAME_COUNT - 1;
const SPRITE = "/avatar/day-night-sprite.png";

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
  const [frame, setFrame] = React.useState(LAST_FRAME);

  const prevTheme = React.useRef<string | undefined>(undefined);
  const frameRef = React.useRef(LAST_FRAME);
  const raf = React.useRef<number | null>(null);

  const setCurrentFrame = React.useCallback((nextFrame: number) => {
    frameRef.current = nextFrame;
    setFrame(nextFrame);
  }, []);

  React.useEffect(() => {
    setMounted(true);
    prevTheme.current = resolvedTheme;
    setCurrentFrame(resolvedTheme === "dark" ? LAST_FRAME : FIRST_FRAME);

    const image = new Image();
    image.onerror = () => setBroken(true);
    image.src = SPRITE;

    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!mounted || !resolvedTheme) return;
    if (!prevTheme.current || prevTheme.current === resolvedTheme) {
      prevTheme.current = resolvedTheme;
      setCurrentFrame(resolvedTheme === "dark" ? LAST_FRAME : FIRST_FRAME);
      return;
    }

    prevTheme.current = resolvedTheme;
    const from = frameRef.current;
    const to = resolvedTheme === "dark" ? LAST_FRAME : FIRST_FRAME;
    const distance = to - from;
    const startedAt = performance.now();

    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
    }

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / ANIM_MS, 1);
      setCurrentFrame(Math.round(from + distance * progress));

      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
        return;
      }

      raf.current = null;
      setCurrentFrame(to);
    };

    raf.current = requestAnimationFrame(tick);
  }, [resolvedTheme, mounted, setCurrentFrame]);

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
      <div
        aria-label="Аватар Алексея"
        role="img"
        className="absolute inset-0 h-full w-full bg-cover"
        style={{
          backgroundImage: `url(${SPRITE})`,
          backgroundPosition: `${(-frame * size).toFixed(2)}px 0`,
          backgroundSize: `${size * FRAME_COUNT}px ${size}px`,
        }}
      />
    </div>
  );
}
