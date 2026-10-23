"use client";

import * as React from "react";
import type { ResearchBlock } from "@/lib/research";

// Цвета графиков — проверенная палитра (dataviz: первые три слота валидны
// попарно в обеих темах на поверхностях сайта #ffffff / #181818). Бирюзовый
// в светлой теме ниже 3:1 к фону — поэтому у долей всегда есть подписи.
// Акцент — синий слот 1; фон-контекст — серый (форма «emphasis»).
const SERIES = [
  "bg-[#2a78d6] dark:bg-[#3987e5]",
  "bg-[#eb6834] dark:bg-[#d95926]",
  "bg-[#1baf7a] dark:bg-[#199e70]",
];
// Те же цвета для SVG (fill / stroke).
const SERIES_FILL = [
  "fill-[#2a78d6] dark:fill-[#3987e5]",
  "fill-[#eb6834] dark:fill-[#d95926]",
  "fill-[#1baf7a] dark:fill-[#199e70]",
];
const SERIES_STROKE = [
  "stroke-[#2a78d6] dark:stroke-[#3987e5]",
  "stroke-[#eb6834] dark:stroke-[#d95926]",
  "stroke-[#1baf7a] dark:stroke-[#199e70]",
];
const ACCENT = SERIES[0];
const MUTED = "bg-neutral-300 dark:bg-neutral-600";
const MUTED_STROKE = "stroke-neutral-200 dark:stroke-neutral-800";

// ---- текст --------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Мини-markdown: **жирный**, *курсив*, [ссылка](url). Текст сначала экранируется. */
function inline(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g,
      (_m, text, href) =>
        href.startsWith("/")
          ? `<a href="${href}">${text}</a>`
          : `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
    );
}

function Markdown({ md }: { md: string }) {
  const html = md
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const lines = para.split("\n");
      if (lines.every((l) => /^\s*-\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*-\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p>${lines.map(inline).join("<br/>")}</p>`;
    })
    .join("");
  return (
    <div
      className="space-y-[0.6lh] text-body text-neutral-800 dark:text-neutral-200 [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-indigo-400 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_ul]:space-y-1.5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ---- обвязка графика ------------------------------------------------------

/**
 * Выбранный элемент графика: мышью — по наведению, пальцем — тапом.
 * Повторный тап по тому же элементу или тап мимо графика снимает выбор.
 */
function useSelect() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [sel, setSel] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (sel === null) return;
    const off = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setSel(null);
    };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [sel]);
  const item = (i: number) => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setSel(i),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setSel(null),
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") setSel((s) => (s === i ? null : i));
    },
  });
  return { ref, sel, setSel, item };
}

/** Обвязка графика без карточки: заголовок, сам график на ширину текста, источник. */
function Figure({
  title,
  subtitle,
  source,
  note,
  children,
}: {
  title?: string;
  subtitle?: string;
  source?: string;
  /** Подпись под графиком/картинкой (у картинок вместо заголовка). */
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <figure>
      {title && (
        <figcaption className="mb-4">
          <div className="text-caption font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</div>
          {subtitle && <div className="mt-1 text-ui text-neutral-500 dark:text-neutral-400">{subtitle}</div>}
        </figcaption>
      )}
      {children}
      {(note || source) && (
        <div className="mt-3 space-y-1">
          {note && <div className="text-ui text-neutral-600 dark:text-neutral-400">{note}</div>}
          {source && <div className="text-small text-neutral-400 dark:text-neutral-500">Источник: {source}</div>}
        </div>
      )}
    </figure>
  );
}

/** Подсказка над строкой графика. */
function Tip({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute -top-9 left-0 z-10 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-small font-medium text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
    >
      {children}
    </span>
  );
}

/** Ширина контейнера — SVG рисуется в реальных пикселях, чтобы текст не масштабировался. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Легенда: цветной маркер, значение и подпись; наведение/тап выделяет группу. */
function Legend({
  items,
  sel,
  item,
}: {
  items: { label: string; value: string; color: string }[];
  sel: number | null;
  item: (i: number) => object;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li
          key={it.label}
          {...item(i)}
          className={`flex cursor-default items-start gap-2 text-ui text-neutral-700 transition-opacity dark:text-neutral-300 ${
            sel !== null && sel !== i ? "opacity-50" : ""
          }`}
        >
          <span className={`mt-[0.35em] h-2.5 w-2.5 shrink-0 rounded-sm ${it.color}`} />
          <span>
            <span className="font-semibold tabular-nums">{it.value}</span> — {it.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---- графики --------------------------------------------------------------

function Bars({ block }: { block: Extract<ResearchBlock, { type: "bars" }> }) {
  const { ref, sel, item } = useSelect();
  const max = Math.max(...block.items.map((i) => i.value));
  const anyHighlight = block.items.some((i) => i.highlight);
  const fmt = (i: (typeof block.items)[number]) =>
    i.display ?? `${i.value.toLocaleString("ru-RU")}${block.unit ?? ""}`;

  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <div ref={ref}>
        <ul className="space-y-2.5">
          {block.items.map((it, i) => (
            <li
              key={it.label}
              {...item(i)}
              className="relative grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]"
            >
              {/* Подпись переносится, а не обрезается многоточием. */}
              <span className="text-ui leading-snug text-neutral-600 dark:text-neutral-400">{it.label}</span>
              <span className="relative flex h-6 items-center gap-2">
                <Tip show={sel === i}>
                  {it.label}: {fmt(it)}
                </Tip>
                <span
                  className={`h-5 rounded-r-[4px] transition-opacity ${
                    !anyHighlight || it.highlight ? ACCENT : MUTED
                  } ${sel !== null && sel !== i ? "opacity-60" : ""}`}
                  style={{ width: `${Math.max((it.value / max) * 85, 1.5)}%` }}
                />
                <span className="shrink-0 text-ui font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                  {fmt(it)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Figure>
  );
}

function Split({ block }: { block: Extract<ResearchBlock, { type: "split" }> }) {
  const { ref, sel, item } = useSelect();
  const total = block.items.reduce((s, i) => s + i.value, 0);
  const pct = (v: number) => Math.round((v / total) * 100);

  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <div ref={ref}>
        {/* Сегменты разделены 2px-зазором цвета поверхности (gap). */}
        <div className="relative flex h-10 gap-[2px]">
          {block.items.map((it, i) => (
            <div
              key={it.label}
              {...item(i)}
              className={`relative flex items-center justify-center text-ui font-semibold text-white first:rounded-l-[4px] last:rounded-r-[4px] ${
                SERIES[i % SERIES.length]
              } ${sel !== null && sel !== i ? "opacity-60" : ""}`}
              style={{ width: `${(it.value / total) * 100}%` }}
            >
              <Tip show={sel === i}>
                {it.label}: {pct(it.value)}%
              </Tip>
              {/* Подпись внутри — только если сегмент достаточно широк. */}
              {pct(it.value) >= 14 && `${pct(it.value)}%`}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Legend
            sel={sel}
            item={item}
            items={block.items.map((it, i) => ({ label: it.label, value: `${pct(it.value)}%`, color: SERIES[i % SERIES.length] }))}
          />
        </div>
      </div>
    </Figure>
  );
}

function Versus({ block }: { block: Extract<ResearchBlock, { type: "versus" }> }) {
  const max = Math.max(block.left.value, block.right.value);
  const rows = [block.left, block.right];
  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ui text-neutral-600 dark:text-neutral-400">{r.label}</span>
              <span className="text-lead font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {r.display ?? r.value.toLocaleString("ru-RU")}
              </span>
            </div>
            <div className="mt-1.5 h-4 rounded-[4px] bg-neutral-100 dark:bg-neutral-800">
              <div
                className={`h-4 rounded-[4px] ${i === 1 ? ACCENT : MUTED}`}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Figure>
  );
}

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function Line({ block }: { block: Extract<ResearchBlock, { type: "line" }> }) {
  const [wref, width] = useWidth<HTMLDivElement>(640);
  const { ref, sel, setSel } = useSelect();

  const pts = block.points.map((p) => {
    const [y, m] = p.date.split("-").map(Number);
    return { ...p, t: y + ((m || 1) - 1) / 12, year: y, month: m || 1 };
  });
  const fmt = (p: (typeof pts)[number]) => p.display ?? p.value.toLocaleString("ru-RU");

  // Шкалы. Y — линейная от нуля или логарифмическая (рост «в разы»).
  // Подписи шкалы Y стоят над линиями сетки внутри графика — слева не
  // тратим ширину, на телефоне график занимает всю ширину текста.
  const H = width < 480 ? 230 : 280;
  const pad = { top: 26, right: 8, bottom: 26, left: 6 };
  const iw = Math.max(width - pad.left - pad.right, 10);
  const ih = H - pad.top - pad.bottom;
  const tMin = Math.floor(Math.min(...pts.map((p) => p.t)));
  // Ось — до последней точки, без пустого «будущего» года.
  const tMax = Math.max(...pts.map((p) => p.t), tMin + 1);
  const vals = pts.map((p) => p.value);
  const f = block.log ? Math.log10 : (v: number) => v;
  const ticks =
    block.ticks ??
    (block.log
      ? Array.from(
          { length: Math.floor(Math.log10(Math.max(...vals))) - Math.floor(Math.log10(Math.min(...vals))) + 1 },
          (_, i) => {
            const v = 10 ** (Math.floor(Math.log10(Math.min(...vals))) + i);
            return { value: v, label: v.toLocaleString("ru-RU") };
          }
        )
      : [0, 0.25, 0.5, 0.75, 1].map((k) => {
          const v = Math.round(Math.max(...vals) * k);
          return { value: v, label: v.toLocaleString("ru-RU") };
        }));
  const yLo = Math.min(f(Math.min(...vals)), ...ticks.map((t) => f(t.value)));
  const yHi = Math.max(f(Math.max(...vals)), ...ticks.map((t) => f(t.value)));
  const x = (t: number) => pad.left + ((t - tMin) / (tMax - tMin || 1)) * iw;
  const y = (v: number) => pad.top + ih - ((f(v) - yLo) / (yHi - yLo || 1)) * ih;

  // Подписи лет: на узком экране — через одну.
  const years = Array.from({ length: Math.floor(tMax) - tMin + 1 }, (_, i) => tMin + i);
  const yearStep = iw / years.length < 46 ? 2 : 1;

  // Ближайшая точка по X — на линию целиться не надо.
  const nearest = (e: React.PointerEvent<SVGSVGElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(x(p.t) - px) < Math.abs(x(pts[best].t) - px)) best = i;
    });
    return best;
  };

  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${path}L${x(pts[pts.length - 1].t).toFixed(1)},${pad.top + ih}L${x(pts[0].t).toFixed(1)},${pad.top + ih}Z`;
  const hp = sel !== null ? pts[sel] : null;

  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <div ref={ref}>
        <div ref={wref} className="relative">
          <svg
            width={width}
            height={H}
            className="block touch-pan-y select-none overflow-visible"
            onPointerMove={(e) => e.pointerType === "mouse" && setSel(nearest(e))}
            onPointerLeave={(e) => e.pointerType === "mouse" && setSel(null)}
            onPointerUp={(e) => {
              if (e.pointerType === "mouse") return;
              const i = nearest(e);
              setSel((s) => (s === i ? null : i));
            }}
            role="img"
            aria-label={block.title}
          >
            {/* Сетка и шкала Y — тонкие и тихие. */}
            {ticks.map((t) => (
              <g key={t.value}>
                <line
                  x1={0}
                  x2={pad.left + iw}
                  y1={y(t.value)}
                  y2={y(t.value)}
                  className="stroke-neutral-200 dark:stroke-neutral-800"
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={y(t.value) - 5}
                  className="fill-neutral-500 text-smallest tabular-nums dark:fill-neutral-400"
                >
                  {t.label}
                </text>
              </g>
            ))}
            {years.map((yr, i) =>
              i % yearStep ? null : (
                <text
                  key={yr}
                  x={x(yr)}
                  y={pad.top + ih + 18}
                  textAnchor={i === 0 ? "start" : x(yr) > pad.left + iw - 16 ? "end" : "middle"}
                  className="fill-neutral-500 text-smallest tabular-nums dark:fill-neutral-400"
                >
                  {yr}
                </text>
              )
            )}

            <path d={area} className="fill-[#2a78d6]/10 dark:fill-[#3987e5]/10" />
            <path
              d={path}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="stroke-[#2a78d6] dark:stroke-[#3987e5]"
            />

            {hp && (
              <line
                x1={x(hp.t)}
                x2={x(hp.t)}
                y1={pad.top}
                y2={pad.top + ih}
                className="stroke-neutral-400 dark:stroke-neutral-500"
                strokeWidth={1}
              />
            )}

            {pts.map((p, i) => (
              <circle
                key={p.label}
                cx={x(p.t)}
                cy={y(p.value)}
                r={sel === i ? 6 : 4.5}
                strokeWidth={2}
                className="fill-[#2a78d6] stroke-white dark:fill-[#3987e5] dark:stroke-[#181818]"
              />
            ))}

            {/* Прямые подписи — только у ключевых точек. */}
            {pts.map((p, i) => {
              if (!p.highlight || sel === i) return null;
              const cx = x(p.t);
              const anchor = cx > pad.left + iw - 60 ? "end" : cx < pad.left + 60 ? "start" : "middle";
              return (
                <text
                  key={p.label}
                  x={cx}
                  y={y(p.value) - 12}
                  textAnchor={anchor}
                  className="fill-neutral-800 text-[12px] font-medium dark:fill-neutral-200"
                >
                  {p.label} · {fmt(p)}
                </text>
              );
            })}
          </svg>

          {hp && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-small text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
              style={{
                left: Math.max(Math.min(x(hp.t) - 70, width - 150), 0),
                top: y(hp.value) - 12,
              }}
            >
              <div className="font-medium">{hp.label}</div>
              <div className="opacity-80">
                {fmt(hp)} · {MONTHS_SHORT[hp.month - 1]} {hp.year}
              </div>
            </div>
          )}
        </div>
      </div>
    </Figure>
  );
}

/** Картинка из исследования — как есть, без стилизации. */
function ImageBlock({ block }: { block: Extract<ResearchBlock, { type: "image" }> }) {
  if (!block.src) return null;
  return (
    <Figure note={block.caption} source={block.source}>
      {/* Белая подложка — рисунки из отчётов рассчитаны на белый фон. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.src}
        alt={block.caption ?? ""}
        width={block.size?.[0]}
        height={block.size?.[1]}
        loading="lazy"
        decoding="async"
        // Не шире своего размера (мелкие рисунки не мылятся) и не выше 70%
        // экрана (высокие помещаются в один экран); место резервируется сразу.
        style={
          block.size
            ? { maxWidth: `min(100%, ${block.size[0]}px, calc(70vh * ${(block.size[0] / block.size[1]).toFixed(4)}))` }
            : undefined
        }
        className="mx-auto block h-auto w-full rounded-xl bg-white"
      />
    </Figure>
  );
}

/** Последовательность событий: время слева, точка на линии, описание справа. */
function Timeline({ block }: { block: Extract<ResearchBlock, { type: "timeline" }> }) {
  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <ol>
        {block.items.map((it, i) => (
          <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-x-4 sm:grid-cols-[5.5rem_1fr]">
            <div
              className={`pt-px text-right text-ui tabular-nums ${
                it.highlight ? "font-semibold text-[#2a78d6] dark:text-[#3987e5]" : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {it.time}
            </div>
            <div
              className={`relative border-l pl-5 ${
                i === block.items.length - 1 ? "border-transparent pb-0" : "border-neutral-200 pb-5 dark:border-neutral-800"
              }`}
            >
              <span
                className={`absolute -left-[5px] top-[0.45em] h-[9px] w-[9px] rounded-full ring-4 ring-white dark:ring-[#181818] ${
                  it.highlight ? ACCENT : "bg-neutral-400 dark:bg-neutral-500"
                }`}
              />
              <div className={`text-ui ${it.highlight ? "font-semibold text-neutral-900 dark:text-neutral-100" : "text-neutral-800 dark:text-neutral-200"}`}>
                {it.label}
              </div>
              {it.text && <div className="mt-0.5 text-ui text-neutral-500 dark:text-neutral-400">{it.text}</div>}
            </div>
          </li>
        ))}
      </ol>
    </Figure>
  );
}

/** «Сто точек»: доля как закрашенные точки из total. */
function Units({ block }: { block: Extract<ResearchBlock, { type: "units" }> }) {
  const { ref, sel, item } = useSelect();
  const total = block.total ?? 100;
  const cols = total <= 10 ? total : 10;
  // Каждой точке — номер группы (или -1 — остаток).
  const owner: number[] = [];
  block.items.forEach((it, g) => {
    for (let k = 0; k < Math.round(it.value); k++) owner.push(g);
  });
  while (owner.length < total) owner.push(-1);

  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <div ref={ref} className="grid items-center gap-5 sm:grid-cols-[minmax(0,17rem)_1fr]">
        <div className="grid max-w-[17rem] gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {owner.slice(0, total).map((g, k) => (
            <span
              key={k}
              {...(g >= 0 ? item(g) : {})}
              className={`aspect-square rounded-[3px] transition-opacity ${
                g >= 0 ? SERIES[g % SERIES.length] : "bg-neutral-200 dark:bg-neutral-700"
              } ${sel !== null && g !== sel ? "opacity-40" : ""}`}
            />
          ))}
        </div>
        <Legend
          sel={sel}
          item={item}
          items={block.items.map((it, i) => ({
            label: it.label,
            value: `${it.value.toLocaleString("ru-RU")} из ${total}`,
            color: SERIES[i % SERIES.length],
          }))}
        />
      </div>
    </Figure>
  );
}

/** Кольцо: доли целого, 2–5 частей, с подписью в центре. */
function Donut({ block }: { block: Extract<ResearchBlock, { type: "donut" }> }) {
  const { ref, sel, item } = useSelect();
  const total = block.items.reduce((s, i) => s + i.value, 0);
  const pct = (v: number) => Math.round((v / total) * 100);
  const size = 200, stroke = 30, r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const gap = block.items.length > 1 ? 2 : 0; // 2px — зазор цвета фона между долями
  let acc = 0;

  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <div ref={ref} className="grid items-center gap-5 sm:grid-cols-[200px_1fr]">
        <div className="relative mx-auto h-[200px] w-[200px]">
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" role="img" aria-label={block.title}>
            {block.items.map((it, i) => {
              const len = (it.value / total) * C;
              const el = (
                <circle
                  key={it.label}
                  {...item(i)}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={sel === i ? stroke + 4 : stroke}
                  strokeDasharray={`${Math.max(len - gap, 0)} ${C}`}
                  strokeDashoffset={-acc}
                  className={`transition-opacity ${SERIES_STROKE[i % SERIES_STROKE.length]} ${
                    sel !== null && sel !== i ? "opacity-40" : ""
                  }`}
                />
              );
              acc += len;
              return el;
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10 text-center">
            {sel !== null ? (
              <span className="text-lead font-semibold tabular-nums">{pct(block.items[sel].value)}%</span>
            ) : (
              block.center && <span className="text-ui font-medium leading-snug text-neutral-700 dark:text-neutral-300">{block.center}</span>
            )}
          </div>
        </div>
        <Legend
          sel={sel}
          item={item}
          items={block.items.map((it, i) => ({ label: it.label, value: `${pct(it.value)}%`, color: SERIES[i % SERIES.length] }))}
        />
      </div>
    </Figure>
  );
}

/** Циферблат-полукруг: 1–3 значения на одной шкале от 0 до max. */
function Dial({ block }: { block: Extract<ResearchBlock, { type: "dial" }> }) {
  const { ref, sel, item } = useSelect();
  const items = block.items.slice(0, 3);
  const W = 300, cx = W / 2, cy = 150, stroke = 16, step = 24;
  const fmt = (it: (typeof items)[number]) => it.display ?? `${it.value.toLocaleString("ru-RU")}${block.unit ?? ""}`;
  // Полукруг слева направо: 0 — слева, max — справа.
  const arc = (rad: number, v: number) => {
    const a = Math.PI * (1 - Math.min(Math.max(v / block.max, 0), 1));
    const x = cx + rad * Math.cos(a), y = cy - rad * Math.sin(a);
    return `M${cx - rad},${cy} A${rad},${rad} 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const anyHighlight = items.some((i) => i.highlight);
  const color = (i: number) => (!anyHighlight || items[i].highlight ? i : -1);

  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <div ref={ref} className="grid items-center gap-5 sm:grid-cols-[300px_1fr]">
        <svg viewBox={`0 0 ${W} ${cy + 22}`} className="mx-auto w-full max-w-[300px]" role="img" aria-label={block.title}>
          {items.map((it, i) => {
            const rad = 130 - i * step;
            const c = color(i);
            return (
              <g key={it.label} {...item(i)} className={`transition-opacity ${sel !== null && sel !== i ? "opacity-40" : ""}`}>
                <path d={arc(rad, block.max)} fill="none" strokeWidth={stroke} className={MUTED_STROKE} />
                <path
                  d={arc(rad, it.value)}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  className={c >= 0 ? SERIES_STROKE[c % SERIES_STROKE.length] : "stroke-neutral-400 dark:stroke-neutral-500"}
                />
              </g>
            );
          })}
          <text x={cx - 130} y={cy + 18} textAnchor="middle" className="fill-neutral-500 text-smallest dark:fill-neutral-400">
            0{block.unit ?? ""}
          </text>
          <text x={cx + 130} y={cy + 18} textAnchor="middle" className="fill-neutral-500 text-smallest dark:fill-neutral-400">
            {block.max.toLocaleString("ru-RU")}
            {block.unit ?? ""}
          </text>
        </svg>
        <Legend
          sel={sel}
          item={item}
          items={items.map((it, i) => ({
            label: it.label,
            value: fmt(it),
            color: color(i) >= 0 ? SERIES[color(i) % SERIES.length] : "bg-neutral-400 dark:bg-neutral-500",
          }))}
        />
      </div>
    </Figure>
  );
}

/** Крупные цифры — без карточек, отделены тонкой линией сверху. */
function Stats({ block }: { block: Extract<ResearchBlock, { type: "stats" }> }) {
  return (
    <div className={`grid gap-x-6 gap-y-5 ${block.items.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {block.items.map((s) => (
        <div key={s.label} className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <div className="text-focal font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{s.value}</div>
          <div className="mt-1.5 text-ui leading-snug text-neutral-600 dark:text-neutral-400">{s.label}</div>
          {s.source && <div className="mt-1 text-small text-neutral-400 dark:text-neutral-500">{s.source}</div>}
        </div>
      ))}
    </div>
  );
}

// ---- сборка ---------------------------------------------------------------

export function ResearchBlocks({ blocks }: { blocks: ResearchBlock[] }) {
  return (
    <div className="space-y-8">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "text":
            return <Markdown key={i} md={b.md} />;
          case "heading":
            return (
              <h2 key={i} className="pt-4 text-lead font-bold tracking-tight">
                {b.text}
              </h2>
            );
          case "stats":
            return <Stats key={i} block={b} />;
          case "bars":
            return <Bars key={i} block={b} />;
          case "split":
            return <Split key={i} block={b} />;
          case "versus":
            return <Versus key={i} block={b} />;
          case "line":
            return <Line key={i} block={b} />;
          case "image":
            return <ImageBlock key={i} block={b} />;
          case "timeline":
            return <Timeline key={i} block={b} />;
          case "units":
            return <Units key={i} block={b} />;
          case "donut":
            return <Donut key={i} block={b} />;
          case "dial":
            return <Dial key={i} block={b} />;
          case "fact":
            return (
              <aside
                key={i}
                className="rounded-2xl border-l-4 border-indigo-500 bg-indigo-500/5 px-5 py-4 text-body text-neutral-800 dark:text-neutral-200"
              >
                <div className="mb-1 text-small font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Кстати
                </div>
                {b.text}
              </aside>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-neutral-300 pl-5 text-lead italic text-neutral-700 dark:border-neutral-600 dark:text-neutral-300">
                «{b.text}»
                {b.author && <footer className="mt-2 text-ui not-italic text-neutral-500">— {b.author}</footer>}
              </blockquote>
            );
        }
      })}
    </div>
  );
}
