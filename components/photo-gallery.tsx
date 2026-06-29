"use client";

import * as React from "react";
import { Lightbox } from "@/components/lightbox";

/**
 * Галерея фотографий в духе «Фото» на айфоне: плотная сетка квадратных
 * превью без подписей. Тап по снимку открывает его на весь экран в едином
 * лайтбоксе (см. components/lightbox.tsx).
 */
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

  // Видимые снимки и их адреса с учётом выбранной категории.
  const visible = React.useMemo(
    () => (cat ? photos.filter((p) => p.category === cat) : photos),
    [photos, cat]
  );
  const items = React.useMemo(() => visible.map((p) => p.src), [visible]);

  // Смена категории закрывает открытый лайтбокс, чтобы индекс не «уехал».
  const selectCategory = React.useCallback((id: string | null) => {
    setOpen(null);
    setCat(id);
  }, []);

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

      {open !== null && (
        <Lightbox items={items} startIndex={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
