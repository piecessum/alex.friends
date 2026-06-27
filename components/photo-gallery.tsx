"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Галерея фотографий в духе «Фото» на айфоне: плотная сетка квадратных
 * превью без подписей. Тап по снимку открывает его на весь экран в
 * лайтбоксе с навигацией влево/вправо, клавиатурой и свайпом.
 */
export function PhotoGallery({ photos }: { photos: string[] }) {
  // null = лайтбокс закрыт, иначе индекс открытой фотографии.
  const [open, setOpen] = React.useState<number | null>(null);

  const close = React.useCallback(() => setOpen(null), []);
  const show = React.useCallback(
    (delta: number) =>
      setOpen((i) =>
        i === null ? i : (i + delta + photos.length) % photos.length
      ),
    [photos.length]
  );

  // Управление клавиатурой и блокировка прокрутки фона, пока открыт лайтбокс.
  React.useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(1);
      else if (e.key === "ArrowLeft") show(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, show]);

  // Свайп пальцем в лайтбоксе.
  const touchX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) show(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  return (
    <>
      {/* Плотная сетка квадратных превью */}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-square overflow-hidden rounded-sm bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-neutral-800"
            aria-label={`Открыть фото ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="dialog"
          aria-modal="true"
        >
          {/* Закрыть */}
          <button
            type="button"
            onClick={close}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5 sm:top-5"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Счётчик */}
          <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90 sm:top-5">
            {open + 1} / {photos.length}
          </span>

          {/* Назад */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              show(-1);
            }}
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-5"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Вперёд */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              show(1);
            }}
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5"
            aria-label="Следующее фото"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Сама фотография — клик по ней не закрывает окно */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photos[open]}
            src={photos[open]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-md object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
