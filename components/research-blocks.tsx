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
const ACCENT = SERIES[0];
const MUTED = "bg-neutral-300 dark:bg-neutral-600";

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
      className="space-y-4 text-[17px] leading-relaxed text-neutral-800 dark:text-neutral-200 [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-indigo-400 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_ul]:space-y-1.5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ---- обвязка графика ------------------------------------------------------

function Figure({
  title,
  subtitle,
  source,
  children,
}: {
  title?: string;
  subtitle?: string;
  source?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-[#181818]">
      {title && (
        <figcaption className="mb-5">
          <div className="font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </div>
          {subtitle && (
            <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</div>
          )}
        </figcaption>
      )}
      {children}
      {source && (
        <div className="mt-5 text-xs text-neutral-400 dark:text-neutral-500">Источник: {source}</div>
      )}
    </figure>
  );
}

/** Подсказка при наведении — над строкой графика. */
function Tip({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute -top-9 left-0 z-10 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
    >
      {children}
    </span>
  );
}

// ---- графики --------------------------------------------------------------

function Bars({ block }: { block: Extract<ResearchBlock, { type: "bars" }> }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(...block.items.map((i) => i.value));
  const anyHighlight = block.items.some((i) => i.highlight);
  const fmt = (i: (typeof block.items)[number]) =>
    i.display ?? `${i.value.toLocaleString("ru-RU")}${block.unit ?? ""}`;

  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <ul className="space-y-2.5">
        {block.items.map((item, i) => (
          <li
            key={item.label}
            className="relative grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {/* Подпись переносится, а не обрезается многоточием. */}
            <span className="text-sm leading-snug text-neutral-600 dark:text-neutral-400">
              {item.label}
            </span>
            <span className="relative flex h-6 items-center gap-2">
              <Tip show={hover === i}>
                {item.label}: {fmt(item)}
              </Tip>
              <span
                className={`h-5 rounded-r-[4px] transition-opacity ${
                  !anyHighlight || item.highlight ? ACCENT : MUTED
                } ${hover !== null && hover !== i ? "opacity-60" : ""}`}
                style={{ width: `${Math.max((item.value / max) * 85, 1.5)}%` }}
              />
              <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {fmt(item)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Figure>
  );
}

function Split({ block }: { block: Extract<ResearchBlock, { type: "split" }> }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const total = block.items.reduce((s, i) => s + i.value, 0);
  const pct = (v: number) => Math.round((v / total) * 100);

  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      {/* Сегменты разделены 2px-зазором цвета поверхности (gap). */}
      <div className="relative flex h-10 gap-[2px]">
        {block.items.map((item, i) => (
          <div
            key={item.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`relative flex items-center justify-center text-sm font-semibold text-white first:rounded-l-[4px] last:rounded-r-[4px] ${
              SERIES[i % SERIES.length]
            } ${hover !== null && hover !== i ? "opacity-60" : ""}`}
            style={{ width: `${(item.value / total) * 100}%` }}
          >
            <Tip show={hover === i}>
              {item.label}: {pct(item.value)}%
            </Tip>
            {/* Подпись внутри — только если сегмент достаточно широк. */}
            {pct(item.value) >= 14 && `${pct(item.value)}%`}
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-1.5">
        {block.items.map((item, i) => (
          <li key={item.label} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm ${SERIES[i % SERIES.length]}`} />
            <span>
              <span className="font-semibold tabular-nums">{pct(item.value)}%</span> — {item.label}
            </span>
          </li>
        ))}
      </ul>
    </Figure>
  );
}

function Versus({ block }: { block: Extract<ResearchBlock, { type: "versus" }> }) {
  const max = Math.max(block.left.value, block.right.value);
  const rows = [block.left, block.right];
  return (
    <Figure title={block.title} subtitle={block.subtitle} source={block.source}>
      <div className="space-y-5">
        {rows.map((r, i) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.label}</span>
              <span className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {r.display ?? r.value.toLocaleString("ru-RU")}
              </span>
            </div>
            <div className="mt-2 h-5 rounded-[4px] bg-neutral-100 dark:bg-neutral-800">
              <div
                className={`h-5 rounded-[4px] ${i === 1 ? ACCENT : MUTED}`}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Figure>
  );
}

function Stats({ block }: { block: Extract<ResearchBlock, { type: "stats" }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {block.items.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#181818]"
        >
          <div className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {s.value}
          </div>
          <div className="mt-2 text-sm leading-snug text-neutral-600 dark:text-neutral-400">{s.label}</div>
          {s.source && <div className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{s.source}</div>}
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
              <h2 key={i} className="pt-4 text-2xl font-bold tracking-tight">
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
          case "fact":
            return (
              <aside
                key={i}
                className="rounded-2xl border-l-4 border-indigo-500 bg-indigo-500/5 px-5 py-4 text-[16px] leading-relaxed text-neutral-800 dark:text-neutral-200"
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Кстати
                </div>
                {b.text}
              </aside>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-neutral-300 pl-5 text-lg italic text-neutral-700 dark:border-neutral-600 dark:text-neutral-300">
                «{b.text}»
                {b.author && <footer className="mt-2 text-sm not-italic text-neutral-500">— {b.author}</footer>}
              </blockquote>
            );
        }
      })}
    </div>
  );
}
