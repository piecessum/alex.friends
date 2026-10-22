"use client";

// Дайджесты недели историями — как на wiki.tridavinci.org/blog (компонент
// stories.tsx из сайта B2B Движения): кружок на неделю, внутри — слайд-обложка
// недели и по слайду на исследование. Тап справа — дальше, слева — назад,
// удержание — пауза, свайп вниз — закрыть. /research?story=<неделя> открывает
// неделю сразу (ссылка из субботнего поста в канале).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";

export type StorySlide = {
  title: string;
  text: string;
  image?: string;
  /** Фон слайда — цвет темы исследования. */
  background: string;
  /** Подпись над заголовком: тема и время чтения или «Дайджест недели». */
  kicker: string;
  href: string;
  cta: string;
};

export type StoryWeek = {
  slug: string;
  label: string;
  preview?: string;
  slides: StorySlide[];
};

const SLIDE_MS = 9000;
const VIEWED_KEY = "research-stories-viewed";

export function ResearchStories({ weeks }: { weeks: StoryWeek[] }) {
  const [week, setWeek] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const touchY = useRef<number | null>(null);

  useEffect(() => {
    try {
      setViewed(new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) ?? "[]")));
    } catch {
      /* localStorage недоступен — просто не помним просмотренные */
    }
  }, []);

  const open = useCallback(
    (w: number, s = 0) => {
      setWeek(w);
      setSlide(s);
      setProgress(0);
      elapsedRef.current = 0;
      setPaused(false);
      setViewed((prev) => {
        const next = new Set(prev).add(weeks[w].slug);
        try {
          localStorage.setItem(VIEWED_KEY, JSON.stringify([...next]));
        } catch {}
        return next;
      });
    },
    [weeks]
  );

  const close = useCallback(() => {
    setWeek(null);
    setDragY(0);
    if (window.location.search.includes("story=")) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  const next = useCallback(() => {
    if (week === null || heldRef.current) return;
    if (slide < weeks[week].slides.length - 1) {
      setSlide(slide + 1);
    } else if (week < weeks.length - 1) {
      open(week + 1);
      return;
    } else {
      close();
      return;
    }
    setProgress(0);
    elapsedRef.current = 0;
  }, [week, slide, weeks, open, close]);

  const prev = useCallback(() => {
    if (week === null || heldRef.current) return;
    if (slide > 0) setSlide(slide - 1);
    else if (week > 0) {
      open(week - 1, weeks[week - 1].slides.length - 1);
      return;
    }
    setProgress(0);
    elapsedRef.current = 0;
  }, [week, slide, weeks, open]);

  // Таймер слайда.
  useEffect(() => {
    if (week === null || paused) return;
    startRef.current = performance.now() - elapsedRef.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / SLIDE_MS, 1);
      elapsedRef.current = now - startRef.current;
      setProgress(p);
      if (p >= 1) {
        elapsedRef.current = 0;
        next();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [week, slide, paused, next]);

  // Клавиатура, блокировка скролла страницы.
  useEffect(() => {
    if (week === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [week, close, next, prev]);

  // ?story=<неделя> — открыть сразу.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("story");
    const i = slug ? weeks.findIndex((w) => w.slug === slug) : -1;
    if (i >= 0) open(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Удержание — пауза (короткий тап паузой не считается).
  const holdStart = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
    }, 200);
  };
  const holdEnd = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (!heldRef.current) return;
    setPaused(false);
    setTimeout(() => (heldRef.current = false), 60);
  };

  if (!weeks.length) return null;
  const w = week !== null ? weeks[week] : null;
  const s = w ? w.slides[slide] : null;

  return (
    <>
      <div className="bleed-page flex items-start gap-4 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {weeks.map((wk, i) => (
          <button key={wk.slug} type="button" onClick={() => open(i)} className="group flex shrink-0 flex-col items-center">
            <span
              className={`relative block h-[124px] w-[88px] overflow-hidden rounded-2xl ring-[3px] ring-offset-2 ring-offset-white transition group-hover:brightness-110 dark:ring-offset-[#181818] ${
                viewed.has(wk.slug) ? "ring-neutral-300 dark:ring-neutral-700" : "ring-indigo-500"
              }`}
              style={{ background: wk.slides[1]?.background ?? "#3a3440" }}
            >
              {wk.preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={wk.preview} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </span>
            <span className="mt-2 w-[88px] text-center text-small leading-tight text-neutral-600 dark:text-neutral-400">
              {wk.label}
            </span>
          </button>
        ))}
      </div>

      {w && s && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={w.label}
          className="fixed inset-0 z-[100] flex select-none items-center justify-center bg-black/95"
          style={{ opacity: dragY > 0 ? Math.max(1 - dragY / 300, 0.3) : 1 }}
          onClick={close}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="relative h-full w-full overflow-hidden md:h-[min(90vh,calc(min(90vw,420px)*16/9))] md:w-auto md:rounded-2xl md:aspect-[9/16]"
            style={{
              background: s.background,
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: dragY === 0 ? "transform 0.2s ease-out" : "none",
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={holdStart}
            onPointerUp={holdEnd}
            onPointerCancel={holdEnd}
            onPointerLeave={holdEnd}
            onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
            onTouchMove={(e) => {
              if (touchY.current === null) return;
              const dy = e.touches[0].clientY - touchY.current;
              if (dy > 0) setDragY(dy);
            }}
            onTouchEnd={() => {
              if (dragY > 120) close();
              setDragY(0);
              touchY.current = null;
            }}
          >
            {/* Затемнение снизу и сверху — текст и полоски читаются на любом фоне. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/50" />

            {/* Полоски прогресса по слайдам недели */}
            <div className="absolute inset-x-4 top-4 z-30 flex gap-1.5">
              {w.slides.map((_, i) => (
                <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: i < slide ? "100%" : i === slide ? `${progress * 100}%` : "0%" }}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть"
              className="absolute right-2 top-7 z-30 p-3 text-white/80 transition hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Слайд: подпись, заголовок, вывод — сверху, картинка — снизу */}
            <div className="relative z-10 flex h-full flex-col px-6 pb-24 pt-16 text-white">
              <div className="text-small font-medium uppercase tracking-wider text-white/75">{s.kicker}</div>
              <h3 className="mt-2 text-[26px] font-bold leading-[1.15] tracking-tight drop-shadow-sm">{s.title}</h3>
              <p className="mt-3 text-[17px] leading-snug text-white/90 drop-shadow-sm">{s.text}</p>
              {s.image && (
                <div className="mt-auto pt-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" className="w-full rounded-xl shadow-2xl" draggable={false} />
                </div>
              )}
            </div>

            {/* Зоны тапа: левая треть — назад, остальное — дальше */}
            <button type="button" aria-label="Назад" onClick={prev} className="absolute left-0 top-0 z-20 h-full w-1/3" />
            <button type="button" aria-label="Дальше" onClick={next} className="absolute right-0 top-0 z-20 h-full w-2/3" />

            <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-5">
              <Link
                href={s.href}
                onClick={close}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/15 text-ui font-medium text-white backdrop-blur transition hover:bg-white/25"
              >
                {s.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Стрелки на десктопе */}
          {(slide > 0 || week! > 0) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Назад"
              className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 md:flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Дальше"
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 md:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}
