"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { TgVideo } from "@/lib/telegram";

/**
 * Медиа поста в стиле лонгрида: фото во всю ширину, без рамок, с просмотром
 * по клику (лайтбокс — стрелки/Esc/клик по фону закрывает). Видео остаются
 * превью со ссылкой в Telegram (сам файл из веб-превью канала недоступен).
 */
export function PostMedia({
  photos,
  videos,
  url,
}: {
  photos: string[];
  videos: TgVideo[];
  url: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;

  const close = useCallback(() => setIndex(null), []);
  const show = useCallback(
    (delta: number) =>
      setIndex((i) =>
        i === null ? i : (i + delta + photos.length) % photos.length
      ),
    [photos.length]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(-1);
      else if (e.key === "ArrowRight") show(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, show]);

  if (photos.length === 0 && videos.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      {photos.map((src, i) => (
        <button
          key={`p${i}`}
          type="button"
          onClick={() => setIndex(i)}
          className="block w-full cursor-zoom-in"
          aria-label="Открыть фото"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            loading="lazy"
            className="mx-auto h-auto w-full rounded-xl"
          />
        </button>
      ))}

      {videos.map((v, i) => (
        <a
          key={`v${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/media relative block aspect-video overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800"
        >
          {v.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.thumb}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              видео
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition group-hover/media:scale-110">
              <Play className="h-6 w-6 translate-x-0.5 fill-current" />
            </span>
            {v.duration && (
              <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {v.duration}
              </span>
            )}
          </span>
        </a>
      ))}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[index]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
          />

          <button
            type="button"
            onClick={close}
            aria-label="Закрыть"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  show(-1);
                }}
                aria-label="Предыдущее фото"
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  show(1);
                }}
                aria-label="Следующее фото"
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                {index + 1} / {photos.length}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
