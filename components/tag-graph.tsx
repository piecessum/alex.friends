"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { GraphNode, GraphLink, TagGraph } from "@/lib/graph";

// ─────────────────────────────────────────────────────────────────────────────
// Force-раскладка графа на canvas без сторонних библиотек. Физику считаем сами:
// отталкивание всех узлов (O(n²) — на ~400 узлах дёшево), пружины по связям,
// слабая гравитация к центру. Раскладку «остужаем» при старте, дальше граф
// почти статичен и оживает только при перетаскивании. Зум колесом, пан мышью.
// ─────────────────────────────────────────────────────────────────────────────

// Палитра тегов: ведущие категории получают узнаваемые цвета, остальные —
// из хвоста палитры по кругу. Цвета одинаковы в обеих темах (яркие на любом фоне).
const TAG_COLORS: Record<string, string> = {
  ux: "#6366f1",
  проект: "#0ea5e9",
  видео: "#ec4899",
  хорошо: "#22c55e",
  плохо: "#ef4444",
  наскругляли: "#f97316",
  исправил: "#14b8a6",
  мысль: "#a855f7",
  цитата: "#eab308",
  уродство: "#f43f5e",
  итоги: "#8b5cf6",
};
const FALLBACK_COLORS = [
  "#64748b", "#0891b2", "#65a30d", "#c026d3", "#d97706", "#7c3aed",
];

function tagColor(tag: string, fallbackIndex: number): string {
  return TAG_COLORS[tag] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}

type Pt = { x: number; y: number; vx: number; vy: number; fixed?: boolean };

// Параметры физики — собраны тут для удобной подстройки «на глаз».
const LINK_DIST = 50;
const LINK_STRENGTH = 0.05;
const CHARGE = 200; // сила отталкивания
const CENTER_GRAVITY = 0.045; // держит слабосвязанные кластеры ближе к центру
const VELOCITY_DECAY = 0.62;
const ALPHA_DECAY = 0.985;
const ALPHA_MIN = 0.0015;
// Прогреваем до полной остановки синхронно, затем граф статичен (оживает
// только при перетаскивании). Так fit() кадрирует уже финальную раскладку.
const WARMUP_TICKS = 600;

function nodeRadius(n: GraphNode): number {
  if (n.kind === "tag") return 6 + Math.sqrt(n.count ?? 1) * 1.6;
  if (n.kind === "note") return 4;
  return 3;
}
function nodeCharge(n: GraphNode): number {
  // Теги массивнее — держат каркас, посты толкаются слабее.
  return n.kind === "tag" ? CHARGE * (1.6 + Math.sqrt(n.count ?? 1) * 0.25) : CHARGE;
}

// Детерминированный PRNG, чтобы раскладка не прыгала между перезагрузками.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function TagGraph({
  data,
  className,
  interactive = true,
  tagLabels = true,
  pan = true,
  highlight = true,
}: {
  data: TagGraph;
  className?: string;
  /** Ховер с подсказкой и клик-навигация по узлам. */
  interactive?: boolean;
  /** Рисовать подписи тегов. В превью-уголке обзорного графа выключаем. */
  tagLabels?: boolean;
  /** Зум колесом, пан фона и перетаскивание узлов. В уголке выключаем. */
  pan?: boolean;
  /** Подсветка соседей при наведении (гасит остальное). В уголке выключаем —
   *  на мелких узлах мигает и мешает; остаётся только подсказка у курсора. */
  highlight?: boolean;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hoverLabel, setHoverLabel] = React.useState<{
    x: number;
    y: number;
    text: string;
    soft?: boolean;
  } | null>(null);

  // Тема влияет только на цвет фона/связей/подписей — пересобираем кадр.
  const dark = resolvedTheme !== "light";

  React.useEffect(() => {
    if (!canvasRef.current) return;
    // Не-null тип держится и в замыканиях ниже (ref примонтирован к этому моменту).
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    // ── Подготовка узлов/связей и индексов ──────────────────────────────────
    const nodes = data.nodes;
    const links = data.links;
    const index = new Map<string, number>();
    nodes.forEach((n, i) => index.set(n.id, i));

    // Цвет каждого тега (хвостовые — по кругу палитры) и его проекция на посты.
    const tagColorMap = new Map<string, string>();
    let fb = 0;
    for (const n of nodes) {
      if (n.kind === "tag") tagColorMap.set(n.tag!, tagColor(n.tag!, fb++));
    }
    const colorOf = (n: GraphNode) =>
      (n.kind === "tag" ? tagColorMap.get(n.tag!) : tagColorMap.get(n.tag ?? "")) ??
      "#94a3b8";

    // Соседи — для подсветки при наведении.
    const neighbors = new Map<string, Set<string>>();
    for (const n of nodes) neighbors.set(n.id, new Set());
    const edges = links
      .map((l) => {
        const a = index.get(l.source);
        const b = index.get(l.target);
        if (a == null || b == null) return null;
        neighbors.get(l.source)!.add(l.target);
        neighbors.get(l.target)!.add(l.source);
        return { a, b, soft: l.soft };
      })
      .filter(Boolean) as { a: number; b: number; soft?: boolean }[];

    // ── Начальные позиции: теги по кольцу, посты рядом с центром ─────────────
    const rnd = mulberry32(0x9e3779b9);
    const pts: Pt[] = nodes.map((n, i) => {
      // Фокус (текущий пост) держим в центре — окружение раскладывается вокруг.
      if (n.focus) return { x: 0, y: 0, vx: 0, vy: 0, fixed: true };
      if (n.kind === "tag") {
        const tagIdx = nodes.slice(0, i + 1).filter((m) => m.kind === "tag").length;
        const a = (tagIdx / Math.max(1, tagColorMap.size)) * Math.PI * 2;
        return { x: Math.cos(a) * 220, y: Math.sin(a) * 220, vx: 0, vy: 0 };
      }
      return { x: (rnd() - 0.5) * 400, y: (rnd() - 0.5) * 400, vx: 0, vy: 0 };
    });
    const charges = nodes.map(nodeCharge);
    const radii = nodes.map(nodeRadius);

    let alpha = 1;
    function tick() {
      // отталкивание (все пары)
      for (let i = 0; i < pts.length; i++) {
        const pi = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const pj = pts[j];
          let dx = pi.x - pj.x;
          let dy = pi.y - pj.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = (rnd() - 0.5) * 1;
            dy = (rnd() - 0.5) * 1;
            d2 = dx * dx + dy * dy + 0.01;
          }
          const f = ((charges[i] + charges[j]) * 0.5 * alpha) / d2;
          const dist = Math.sqrt(d2);
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          pi.vx += fx;
          pi.vy += fy;
          pj.vx -= fx;
          pj.vy -= fy;
        }
      }
      // пружины по связям
      for (const e of edges) {
        const a = pts[e.a];
        const b = pts[e.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = ((dist - LINK_DIST) / dist) * LINK_STRENGTH * alpha;
        const fx = dx * f;
        const fy = dy * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // гравитация к центру + интегрирование
      for (const p of pts) {
        if (p.fixed) {
          p.vx = 0;
          p.vy = 0;
          continue;
        }
        p.vx -= p.x * CENTER_GRAVITY * alpha;
        p.vy -= p.y * CENTER_GRAVITY * alpha;
        p.vx *= VELOCITY_DECAY;
        p.vy *= VELOCITY_DECAY;
        p.x += p.vx;
        p.y += p.vy;
      }
      alpha *= ALPHA_DECAY;
    }

    // Прогрев — чтобы первый кадр был уже разложен, без «взрыва».
    for (let i = 0; i < WARMUP_TICKS; i++) tick();

    // ── Камера: вписываем граф в видимую область ────────────────────────────
    const cam = { x: 0, y: 0, k: 1 };
    let cssW = 0;
    let cssH = 0;
    function fit() {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const pad = 40;
      const w = maxX - minX || 1;
      const h = maxY - minY || 1;
      cam.k = Math.min((cssW - pad * 2) / w, (cssH - pad * 2) / h, 2);
      cam.x = cssW / 2 - ((minX + maxX) / 2) * cam.k;
      cam.y = cssH / 2 - ((minY + maxY) / 2) * cam.k;
    }

    // мир → экран и обратно
    const toScreen = (p: Pt) => ({ x: p.x * cam.k + cam.x, y: p.y * cam.k + cam.y });
    const toWorld = (sx: number, sy: number) => ({
      x: (sx - cam.x) / cam.k,
      y: (sy - cam.y) / cam.k,
    });

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    function resize() {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    fit();

    let hover = -1;
    function draw() {
      ctx.clearRect(0, 0, cssW, cssH);
      const edgeBase = dark ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.22)";
      const labelColor = dark ? "#e5e5e5" : "#1f2937";
      const dim = highlight && hover >= 0;
      const lit = new Set<string>();
      if (dim) {
        lit.add(nodes[hover].id);
        for (const nb of neighbors.get(nodes[hover].id)!) lit.add(nb);
      }

      // связи
      for (const e of edges) {
        const on = !dim || lit.has(nodes[e.a].id) && lit.has(nodes[e.b].id);
        const a = toScreen(pts[e.a]);
        const b = toScreen(pts[e.b]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = on
          ? e.soft
            ? dark
              ? "rgba(148,163,184,0.32)"
              : "rgba(100,116,139,0.4)"
            : edgeBase
          : dark
            ? "rgba(148,163,184,0.05)"
            : "rgba(100,116,139,0.06)";
        ctx.lineWidth = e.soft ? 0.6 : 0.9;
        if (e.soft) ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // узлы
      const accent = dark ? "#818cf8" : "#6366f1";
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const s = toScreen(pts[i]);
        const r = radii[i] * (n.focus ? 2 : 1);
        const on = !dim || lit.has(n.id);
        const c = colorOf(n);
        ctx.globalAlpha = on ? 1 : 0.12;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        if (n.kind !== "tag" && n.soft && !n.focus) {
          // мягкий тег — полый кружок (догадка, а не явный хэштег)
          ctx.fillStyle = dark ? "#0a0a0a" : "#ffffff";
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = c;
          ctx.stroke();
        } else {
          ctx.fillStyle = c;
          ctx.fill();
        }
        // фокус-узел (текущий пост в локальном графе) — кольцо-акцент
        if (n.focus) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, r + 3.5, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = accent;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // подписи тегов (в обзорном превью-уголке не рисуем — мелко и шумно)
      if (!tagLabels) return;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.kind !== "tag") continue;
        const on = !dim || lit.has(n.id);
        const s = toScreen(pts[i]);
        ctx.globalAlpha = on ? 1 : 0.18;
        const fs = Math.max(10, Math.min(16, 9 + (n.count ?? 1) * 0.12));
        ctx.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = dark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)";
        ctx.strokeText(`#${n.label}`, s.x, s.y - radii[i] - 7);
        ctx.fillStyle = labelColor;
        ctx.fillText(`#${n.label}`, s.x, s.y - radii[i] - 7);
        ctx.globalAlpha = 1;
      }
    }

    let raf = 0;
    let running = true;
    function loop() {
      if (!running) return;
      if (alpha > ALPHA_MIN) tick();
      draw();
      raf = requestAnimationFrame(loop);
    }
    loop();

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);

    // ── Взаимодействие ──────────────────────────────────────────────────────
    function pickNode(sx: number, sy: number): number {
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const s = toScreen(pts[i]);
        const r = radii[i] + 4;
        const d = (s.x - sx) ** 2 + (s.y - sy) ** 2;
        if (d <= r * r && d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    }

    let dragNode = -1;
    let panning = false;
    let last = { x: 0, y: 0 };
    let moved = false;

    function onPointerDown(e: PointerEvent) {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      moved = false;
      last = { x: sx, y: sy };
      // Без pan не двигаем — только запоминаем нажатие для клик-навигации.
      if (pan) {
        const hit = pickNode(sx, sy);
        if (hit >= 0) {
          dragNode = hit;
          pts[hit].fixed = true;
        } else {
          panning = true;
        }
      }
      canvas.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (dragNode >= 0) {
        moved = true;
        const w = toWorld(sx, sy);
        pts[dragNode].x = w.x;
        pts[dragNode].y = w.y;
        alpha = Math.max(alpha, 0.3);
        return;
      }
      if (panning) {
        moved = true;
        cam.x += sx - last.x;
        cam.y += sy - last.y;
        last = { x: sx, y: sy };
        draw();
        return;
      }
      // ховер
      const hit = interactive ? pickNode(sx, sy) : -1;
      if (hit !== hover) {
        hover = hit;
        canvas.style.cursor = hit >= 0 ? "pointer" : pan ? "grab" : "default";
        draw();
      }
      if (hit >= 0) {
        const n = nodes[hit];
        setHoverLabel({
          x: sx,
          y: sy,
          text: n.kind === "tag" ? `#${n.label} · ${n.count}` : n.label,
          soft: n.soft,
        });
      } else {
        setHoverLabel(null);
      }
    }
    function onPointerUp(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (dragNode >= 0) pts[dragNode].fixed = false;
      dragNode = -1;
      panning = false;
      // Клик без перетаскивания — переход по узлу под курсором.
      if (!moved) {
        const hit = pickNode(sx, sy);
        if (hit >= 0) navigate(hit);
      }
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }
    function navigate(i: number) {
      const n = nodes[i];
      if (n.kind === "tag") {
        // Открываем ленту, предварительно выставив фильтр по этому тегу.
        try {
          sessionStorage.setItem("writingsFilter", n.tag!);
          sessionStorage.setItem("writingsScroll", "0");
          sessionStorage.setItem("writingsRestore", "1");
        } catch {}
        router.push("/notes");
      } else if (n.href) {
        router.push(n.href);
      }
    }
    function onWheel(e: WheelEvent) {
      if (!interactive || !pan) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const before = toWorld(sx, sy);
      const factor = Math.exp(-e.deltaY * 0.0015);
      cam.k = Math.min(4, Math.max(0.2, cam.k * factor));
      const after = toWorld(sx, sy);
      cam.x += (after.x - before.x) * cam.k;
      cam.y += (after.y - before.y) * cam.k;
      draw();
    }

    if (interactive) {
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      if (pan) canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.style.cursor = pan ? "grab" : "default";
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (interactive) {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("wheel", onWheel);
      }
    };
  }, [data, dark, interactive, tagLabels, pan, highlight, router]);

  return (
    <div className={className} style={{ position: "relative" }}>
      <canvas ref={canvasRef} className="h-full w-full touch-none" />
      {hoverLabel && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-lg border border-neutral-200 bg-white/95 px-2.5 py-1.5 text-xs text-neutral-800 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:text-neutral-200"
          style={{
            left: Math.min(hoverLabel.x + 12, 9999),
            top: hoverLabel.y + 12,
            transform: "translateZ(0)",
          }}
        >
          {hoverLabel.text}
          {hoverLabel.soft && (
            <span className="ml-1 text-neutral-400">· по смыслу</span>
          )}
        </div>
      )}
    </div>
  );
}
