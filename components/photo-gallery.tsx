"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Галерея фотографий в духе «Фото» на айфоне: плотная сетка квадратных
 * превью без подписей. Тап по снимку открывает его на весь экран в
 * лайтбоксе с навигацией влево/вправо, клавиатурой и жестами.
 *
 * Лайтбокс работает как карусель из трёх кадров (предыдущий — текущий —
 * следующий): кадр следует за пальцем, поэтому видно, как фото
 * пролистывается и как оно «утягивается» вниз при закрытии.
 */
const DURATION = 260;
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
const TRANSITION = `transform ${DURATION}ms ${EASE}`;

type Photo = { src: string; category: string };
type Category = { id: string; label: string };

export function PhotoGallery({
  photos,
  categories,
}: {
  photos: Photo[];
  categories: readonly Category[];
}) {
  // null = лайтбокс закрыт, иначе индекс открытой фотографии.
  const [open, setOpen] = React.useState<number | null>(null);
  // Выбранная категория-чипс (null = «Все»).
  const [cat, setCat] = React.useState<string | null>(null);
  // Живое смещение кадра во время жеста (в пикселях).
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  // Включаем CSS-переход только когда «доводим» жест анимацией.
  const [animate, setAnimate] = React.useState(false);

  // Видимые снимки и их адреса с учётом выбранной категории.
  const visible = React.useMemo(
    () => (cat ? photos.filter((p) => p.category === cat) : photos),
    [photos, cat]
  );
  const items = React.useMemo(() => visible.map((p) => p.src), [visible]);
  const n = items.length;

  // Смена категории закрывает открытый лайтбокс, чтобы индекс не «уехал».
  const selectCategory = React.useCallback((id: string | null) => {
    setOpen(null);
    setCat(id);
  }, []);

  const close = React.useCallback(() => setOpen(null), []);

  // Блокируем повторный запуск, пока проигрывается доводящая анимация.
  const settling = React.useRef(false);

  // Листание с анимацией: уводим кадр за край, затем меняем индекс.
  const go = React.useCallback(
    (dir: number) => {
      if (settling.current || n === 0) return;
      settling.current = true;
      setAnimate(true);
      setOffset({ x: dir > 0 ? -window.innerWidth : window.innerWidth, y: 0 });
      window.setTimeout(() => {
        setOpen((i) => (i === null ? i : (i + dir + n) % n));
        setAnimate(false);
        setOffset({ x: 0, y: 0 });
        settling.current = false;
      }, DURATION);
    },
    [n]
  );

  // Закрытие со смахиванием вниз: кадр уезжает вниз, фон гаснет.
  const closeWithSlide = React.useCallback(() => {
    if (settling.current) return;
    settling.current = true;
    setAnimate(true);
    setOffset({ x: 0, y: window.innerHeight });
    window.setTimeout(() => {
      close();
      setAnimate(false);
      setOffset({ x: 0, y: 0 });
      settling.current = false;
    }, DURATION);
  }, [close]);

  // Возврат кадра на место, если жеста не хватило.
  const snapBack = React.useCallback(() => {
    setAnimate(true);
    setOffset({ x: 0, y: 0 });
    window.setTimeout(() => setAnimate(false), DURATION);
  }, []);

  // Управление клавиатурой и блокировка прокрутки фона, пока открыт лайтбокс.
  React.useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, go]);

  // --- Жесты пальцем ---------------------------------------------------------
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const axis = React.useRef<"x" | "y" | null>(null);
  const pinching = React.useRef(false);
  // Гасим клик-закрытие, если только что был жест (а не тап по фону).
  const suppressClick = React.useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      // Пинч-зум двумя пальцами — не жест карусели.
      pinching.current = true;
      start.current = null;
      return;
    }
    if (settling.current) return;
    pinching.current = false;
    axis.current = null;
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setAnimate(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      // Появился второй палец — это зум, отменяем жест.
      pinching.current = true;
      start.current = null;
      setOffset({ x: 0, y: 0 });
      return;
    }
    if (pinching.current || !start.current) return;
    const dx = e.touches[0].clientX - start.current.x;
    const dy = e.touches[0].clientY - start.current.y;
    if (axis.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axis.current === "x") setOffset({ x: dx, y: 0 });
    else setOffset({ x: 0, y: Math.max(0, dy) }); // вниз для закрытия
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinching.current) {
      if (e.touches.length === 0) pinching.current = false;
      return;
    }
    if (!start.current) return;
    const dx = e.changedTouches[0].clientX - start.current.x;
    const dy = e.changedTouches[0].clientY - start.current.y;
    const a = axis.current;
    start.current = null;
    axis.current = null;

    if (a === "x") {
      const threshold = Math.min(window.innerWidth * 0.25, 90);
      if (dx <= -threshold) go(1);
      else if (dx >= threshold) go(-1);
      else snapBack();
    } else if (a === "y") {
      const threshold = Math.min(window.innerHeight * 0.2, 140);
      if (dy >= threshold) closeWithSlide();
      else snapBack();
    }

    if (a) {
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 350);
    }
  };

  const onOverlayClick = () => {
    if (suppressClick.current) return;
    close();
  };

  // Прозрачность фона уменьшается по мере смахивания вниз.
  const fade = 1 - (Math.min(Math.max(offset.y, 0), 800) / 800) * 0.85;

  const prevIdx = n ? (open! - 1 + n) % n : 0;
  const nextIdx = n ? (open! + 1) % n : 0;

  const chip =
    "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
  const chipOn = "bg-amber-500 text-white";
  const chipOff =
    "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700";

  return (
    <>
      {/* Чипсы-категории */}
      {categories.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => selectCategory(null)}
            className={`${chip} ${cat === null ? chipOn : chipOff}`}
          >
            Все
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCategory(c.id)}
              className={`${chip} ${cat === c.id ? chipOn : chipOff}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Плотная сетка квадратных превью */}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
        {visible.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-square overflow-hidden rounded-sm bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-neutral-800"
            aria-label={`Открыть фото ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-active:scale-95"
            />
          </button>
        ))}
      </div>

      {/* Полноэкранный лайтбокс */}
      {open !== null && (
        <div
          className="fixed inset-0 z-[100] overflow-hidden"
          onClick={onOverlayClick}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${0.95 * fade})`,
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          {/* Закрыть */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5 sm:top-5"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Счётчик */}
          <span className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90 sm:top-5">
            {open + 1} / {n}
          </span>

          {/* Назад */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-5"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Вперёд */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5"
            aria-label="Следующее фото"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Карусель: вертикальное смещение для закрытия */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(0, ${offset.y}px, 0)`,
              transition: animate ? TRANSITION : "none",
            }}
          >
            {/* Лента из трёх кадров, горизонтальное смещение для листания */}
            <div
              className="flex h-full w-full"
              style={{
                transform: `translate3d(calc(-100% + ${offset.x}px), 0, 0)`,
                transition: animate ? TRANSITION : "none",
              }}
            >
              {[prevIdx, open, nextIdx].map((idx, k) => (
                <div
                  key={k}
                  className="flex h-full w-full shrink-0 items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={items[idx]}
                    alt=""
                    draggable={false}
                    loading={k === 1 ? "eager" : "lazy"}
                    onClick={(e) => e.stopPropagation()}
                    className="max-h-[100dvh] w-full object-contain sm:h-auto sm:max-h-[88vh] sm:w-auto sm:max-w-[92vw] sm:rounded-md sm:shadow-2xl"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
