"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { FitImage } from "@/components/fit-image";
import { Lightbox } from "@/components/lightbox";
import type { TgVideo } from "@/lib/telegram";

/**
 * Медиа поста в стиле лонгрида: фото во всю ширину, без рамок, с просмотром
 * по клику в едином лайтбоксе (см. components/lightbox.tsx). Видео остаются
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
  // null = лайтбокс закрыт, иначе индекс открытой фотографии.
  const [index, setIndex] = useState<number | null>(null);

  if (photos.length === 0 && videos.length === 0) return null;

  // Сетка для альбома (несколько фото) — как в Telegram: 2 в ряд, 4 — 2×2,
  // иначе по 3 в ряд. Одно фото показываем во всю ширину.
  const gridCols =
    photos.length === 2 || photos.length === 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="mt-6 space-y-3">
      {photos.length === 1 && (
        <FitImage
          src={photos[0]}
          onClick={() => setIndex(0)}
          className="mx-auto h-auto cursor-zoom-in rounded-xl"
        />
      )}

      {photos.length > 1 && (
        <div className={`grid gap-1 overflow-hidden rounded-xl ${gridCols}`}>
          {photos.map((src, i) => (
            <button
              key={`p${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className="group/ph relative aspect-square cursor-zoom-in overflow-hidden bg-neutral-200 dark:bg-neutral-800"
              aria-label="Открыть фото"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition group-hover/ph:opacity-90"
              />
            </button>
          ))}
        </div>
      )}

      {videos.map((v, i) =>
        v.src ? (
          <video
            key={`v${i}`}
            src={v.src}
            poster={v.thumb}
            controls
            playsInline
            preload="metadata"
            className="mx-auto h-auto max-h-[85vh] w-full rounded-xl bg-black"
          />
        ) : (
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
        )
      )}

      {index !== null && (
        <Lightbox
          items={photos}
          startIndex={index}
          onClose={() => setIndex(null)}
        />
      )}
    </div>
  );
}
