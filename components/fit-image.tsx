"use client";

import { useState } from "react";

/**
 * Картинка, которая сама ужимается, если она сильно вытянута по высоте
 * (вертикальный скриншот телефона и т.п.): такой снимок ограничивается высотой
 * экрана, чтобы помещаться без скролла. Обычные (горизонтальные/квадратные)
 * показываются во всю ширину колонки, как раньше.
 *
 * Если реальные пропорции известны заранее (width/height из content/notes/*.json,
 * см. scripts/import-telegraph.mjs) — решение «вытянутая или нет» принимается
 * сразу при рендере, без скачка вёрстки. Если их нет (напр. фото из ленты
 * Telegram, у которых размер заранее не известен) — определяем по факту
 * загрузки через onLoad, как раньше.
 */
export function FitImage({
  src,
  alt = "",
  className = "",
  width,
  height,
  threshold = 1.5,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  threshold?: number;
  onClick?: () => void;
}) {
  const knownTall = width && height ? height / width > threshold : undefined;
  const [tall, setTall] = useState(knownTall ?? false);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      onClick={onClick}
      onLoad={(e) => {
        if (knownTall !== undefined) return; // размеры уже известны заранее
        const el = e.currentTarget;
        if (el.naturalWidth && el.naturalHeight / el.naturalWidth > threshold) {
          setTall(true);
        }
      }}
      className={`${className} ${
        tall ? "max-h-[85vh] w-auto max-w-full" : "w-full"
      }`}
    />
  );
}
