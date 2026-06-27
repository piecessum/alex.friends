"use client";

import * as React from "react";
import { hueOf } from "@/lib/vinyl-utils";

/**
 * 3D-коробка пластинки: лицевая и оборотная стороны + торцы (толщина).
 * Крутится перетаскиванием (мышь/палец).
 */
export function VinylBox({
  title,
  want,
  tracks = [],
  description,
  front: frontImg,
  back: backImg,
}: {
  title: string;
  want?: boolean;
  tracks?: string[];
  description?: string[];
  front?: string;
  back?: string;
}) {
  const h = hueOf(title);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState(340);
  const [rot, setRot] = React.useState({ x: 8, y: -24 });
  const drag = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize(Math.min(el.clientWidth, 380))
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setRot((r) => ({
      x: Math.max(-50, Math.min(50, r.x - dy * 0.4)),
      y: r.y + dx * 0.4,
    }));
  };
  const onUp = () => {
    drag.current = null;
  };

  const depth = Math.max(20, Math.round(size * 0.07));
  const front = `linear-gradient(150deg, hsl(${h} 58% 46%), hsl(${(h + 35) % 360} 52% 26%))`;
  const back = `linear-gradient(150deg, hsl(${h} 30% 20%), hsl(${h} 28% 12%))`;
  const spine = `hsl(${h} 32% 16%)`;

  const face: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
  };

  return (
    <div className="mx-auto w-full max-w-md select-none">
      <div
        ref={wrapRef}
        className="mx-auto cursor-grab touch-none active:cursor-grabbing"
        style={{ width: size, height: size, perspective: 1100 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className="relative h-full w-full transition-transform duration-75 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          }}
        >
          {/* Лицевая сторона */}
          <div
            className="flex flex-col justify-between overflow-hidden rounded-[2px] p-6 shadow-2xl"
            style={{
              ...face,
              width: size,
              height: size,
              background: frontImg ? "#111" : front,
              backfaceVisibility: "hidden",
              transform: `translate(-50%, -50%) translateZ(${depth / 2}px)`,
            }}
          >
            {frontImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={frontImg}
                alt={title}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_-10%_-10%,rgba(255,255,255,0.18),transparent_55%)]" />
                <span className="relative text-xs font-semibold uppercase tracking-widest text-white/55">
                  {want ? "хочу" : "винил"}
                </span>
                <div className="relative text-2xl font-bold leading-tight text-white drop-shadow-sm sm:text-3xl">
                  {title}
                </div>
              </>
            )}
          </div>

          {/* Оборотная сторона */}
          <div
            className="flex flex-col justify-between overflow-hidden rounded-[2px] p-5 text-white/80 shadow-2xl"
            style={{
              ...face,
              width: size,
              height: size,
              background: backImg ? "#111" : back,
              backfaceVisibility: "hidden",
              transform: `translate(-50%, -50%) rotateY(180deg) translateZ(${depth / 2}px)`,
            }}
          >
            {backImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={backImg}
                alt={`${title} — оборот`}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div className="flex items-start justify-between text-[10px] uppercase tracking-widest text-white/40">
                  <span>{want ? "wishlist" : "side A / B"}</span>
                  <span>33⅓ rpm</span>
                </div>
                <div className="text-sm font-semibold text-white/90">{title}</div>
                <div className="min-h-0 flex-1 overflow-hidden py-2 text-[10px] leading-relaxed text-white/55">
                  {description?.length
                    ? description.map((p, i) => <div key={i}>{p}</div>)
                    : tracks.slice(0, 12).map((t, i) => (
                        <div key={i} className="truncate">
                          {i + 1}. {t}
                        </div>
                      ))}
                </div>
                <div
                  className="h-7 w-24 self-end"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg, rgba(255,255,255,0.75) 0 2px, transparent 2px 4px, rgba(255,255,255,0.75) 4px 5px, transparent 5px 8px)",
                  }}
                />
              </>
            )}
          </div>

          {/* Правый торец */}
          <div
            style={{
              ...face,
              width: depth,
              height: size,
              background: spine,
              transform: `translate(-50%, -50%) rotateY(90deg) translateZ(${size / 2}px)`,
            }}
          />
          {/* Левый торец (корешок) */}
          <div
            className="flex items-center justify-center"
            style={{
              ...face,
              width: depth,
              height: size,
              background: spine,
              transform: `translate(-50%, -50%) rotateY(-90deg) translateZ(${size / 2}px)`,
            }}
          >
            <span
              className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-widest text-white/60"
              style={{ transform: "rotate(90deg)" }}
            >
              {title}
            </span>
          </div>
          {/* Верхний торец */}
          <div
            style={{
              ...face,
              width: size,
              height: depth,
              background: `hsl(${h} 30% 24%)`,
              transform: `translate(-50%, -50%) rotateX(90deg) translateZ(${size / 2}px)`,
            }}
          />
          {/* Нижний торец */}
          <div
            style={{
              ...face,
              width: size,
              height: depth,
              background: `hsl(${h} 28% 10%)`,
              transform: `translate(-50%, -50%) rotateX(-90deg) translateZ(${size / 2}px)`,
            }}
          />
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-neutral-400 dark:text-neutral-500">
        Покрути коробку — потяни мышкой или пальцем
      </p>
    </div>
  );
}
