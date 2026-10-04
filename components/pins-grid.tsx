"use client";

import * as React from "react";
import { Lightbox } from "@/components/lightbox";
import { pinSrc, pinSrcSet, type Pin } from "@/lib/pin-urls";

// Колонок — по ширине экрана; картинки встык, без отступов.
const COLS = [
  { min: 1536, n: 7 },
  { min: 1280, n: 6 },
  { min: 1024, n: 5 },
  { min: 768, n: 4 },
  { min: 480, n: 3 },
  { min: 0, n: 2 },
];

// Рендерим порциями: сразу — первая, остальные дорисовываются при подлёте к
// низу (данные уже на клиенте, сеть тут не участвует — только DOM).
const CHUNK = 150;

// Как в writings-grid: число колонок считаем до первой отрисовки кадра,
// чтобы сетка не перескакивала.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function useColumnCount(): number {
  const [n, setN] = React.useState(5);
  useIsomorphicLayoutEffect(() => {
    const calc = () => setN(COLS.find((c) => window.innerWidth >= c.min)?.n ?? 2);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return n;
}

/**
 * Пины «картинка к картинке» во всю ширину. Раскладка как у Pinterest:
 * каждый следующий пин — в самую короткую колонку (высоты известны заранее
 * из пропорций, поэтому ничего не прыгает). Пока картинка грузится, её место
 * залито средним цветом пина. Клик — полноэкранный просмотр.
 */
export function PinsGrid({ pins }: { pins: Pin[] }) {
  const columnCount = useColumnCount();
  const [shown, setShown] = React.useState(CHUNK);
  const [open, setOpen] = React.useState<number | null>(null);
  const sentinel = React.useRef<HTMLDivElement>(null);

  const visible = pins.slice(0, shown);

  // Жадная раскладка по самой короткой колонке. Последовательная, поэтому
  // дорисовка следующей порции не двигает уже показанные пины.
  const columns = React.useMemo(() => {
    const cols: { pin: Pin; i: number }[][] = Array.from({ length: columnCount }, () => []);
    const heights = new Array(columnCount).fill(0);
    visible.forEach((pin, i) => {
      const c = heights.indexOf(Math.min(...heights));
      cols[c].push({ pin, i });
      heights[c] += pin.h / pin.w;
    });
    return cols;
  }, [visible, columnCount]);

  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || shown >= pins.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((s) => Math.min(s + CHUNK, pins.length));
        }
      },
      { rootMargin: "1500px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, pins.length]);

  const sizes = `${Math.ceil(100 / columnCount)}vw`;
  const eagerRows = columnCount * 3;

  return (
    <>
      <div className="flex items-start">
        {columns.map((col, ci) => (
          <div key={ci} className="flex min-w-0 flex-1 flex-col">
            {col.map(({ pin, i }) => (
              <button
                key={pin.id}
                type="button"
                onClick={() => setOpen(i)}
                aria-label={pin.title || "Открыть пин"}
                className="block w-full cursor-zoom-in"
                style={{ aspectRatio: `${pin.w} / ${pin.h}`, background: pin.color }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pinSrc(pin)}
                  srcSet={pinSrcSet(pin)}
                  sizes={sizes}
                  alt={pin.title ?? ""}
                  width={pin.w}
                  height={pin.h}
                  loading={i < eagerRows ? "eager" : "lazy"}
                  decoding="async"
                  className="block h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        ))}
      </div>
      <div ref={sentinel} aria-hidden />

      {open !== null && (
        <Lightbox
          items={visible.map((p) => pinSrc(p, 736))}
          startIndex={open}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
