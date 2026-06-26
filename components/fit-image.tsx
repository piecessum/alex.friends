"use client";

import { useState } from "react";

/**
 * Картинка, которая сама ужимается, если она сильно вытянута по высоте
 * (вертикальный скриншот телефона и т.п.): такой снимок ограничивается высотой
 * экрана, чтобы помещаться без скролла. Обычные (горизонтальные/квадратные)
 * показываются во всю ширину колонки, как раньше.
 *
 * «Высоту» определяем по реальным пропорциям после загрузки: если
 * высота/ширина больше порога — считаем снимок вытянутым.
 */
export function FitImage({
  src,
  alt = "",
  className = "",
  threshold = 1.5,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  threshold?: number;
  onClick?: () => void;
}) {
  const [tall, setTall] = useState(false);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onClick={onClick}
      onLoad={(e) => {
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
