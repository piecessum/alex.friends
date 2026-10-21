// Раздел «Исследования» (/research): пересказы интересных исследований —
// коротко, с графиками и ссылкой на оригинал. Каждое исследование — один
// файл content/research/<slug>.json, его пишет ежедневный агент (см.
// content/research/AGENT.md) или руками. Графики описываются данными и
// рисуются компонентами из components/research-blocks.tsx.

import fs from "node:fs";
import path from "node:path";
import type { Sprite } from "@/lib/voxel-cover";

export type ResearchTopic =
  | "interfaces"
  | "ai"
  | "brain"
  | "market"
  | "gadgets"
  | "cars"
  | "b2b";

export const TOPICS: Record<ResearchTopic, string> = {
  interfaces: "Интерфейсы",
  ai: "Нейросети",
  brain: "Психология",
  market: "Рынок",
  gadgets: "Гаджеты",
  cars: "Автомобили",
  b2b: "B2B",
};

/** Фон превью по теме — матовые тона с доски-референса (кассеты). Запасной
 *  тон для новой темы — сливочно-жёлтый #f5d37f. */
/** Как назвать цвет фона модели превью (по-английски, см. research-cover). */
export const TOPIC_COLOR_NAMES: Record<ResearchTopic, string> = {
  interfaces: "muted warm orange",
  ai: "dusty mauve grey",
  brain: "deep muted aubergine purple",
  market: "warm muted golden yellow",
  gadgets: "muted olive taupe brown",
  cars: "muted terracotta",
  b2b: "muted sandy beige",
};

export const TOPIC_COLORS: Record<ResearchTopic, string> = {
  interfaces: "#df8f48",
  ai: "#7f7277",
  brain: "#452243",
  market: "#e6ba6b",
  gadgets: "#937b5d",
  cars: "#c97a4d",
  b2b: "#a98d70",
};

/** Второй цвет коллажа (плашка за объектом) — из той же палитры, контрастный к фону. */
export const TOPIC_ACCENTS: Record<ResearchTopic, string> = {
  interfaces: "#452243",
  ai: "#e6ba6b",
  brain: "#df8f48",
  market: "#c97a4d",
  gadgets: "#f5d37f",
  cars: "#f5d37f",
  b2b: "#452243",
};

export type ResearchBlock =
  /** Абзацы. Поддерживается **жирный**, *курсив*, [ссылка](url) и списки «- ». */
  | { type: "text"; md: string }
  | { type: "heading"; text: string }
  /** Ряд крупных цифр. */
  | { type: "stats"; items: { value: string; label: string; source?: string }[] }
  /** Горизонтальные столбики — сравнение величин; highlight — акцентные строки. */
  | {
      type: "bars";
      title: string;
      subtitle?: string;
      unit?: string;
      items: { label: string; value: number; display?: string; highlight?: boolean }[];
      source?: string;
    }
  /** Доли целого (2–3 части) — одна полоса. */
  | {
      type: "split";
      title: string;
      subtitle?: string;
      items: { label: string; value: number }[];
      source?: string;
    }
  /** Пары значений «до/после», «было/стало», «доля А vs доля Б». */
  | {
      type: "versus";
      title: string;
      subtitle?: string;
      left: { label: string; value: number; display?: string };
      right: { label: string; value: number; display?: string };
      source?: string;
    }
  /** Линия во времени — как величина менялась по годам. date — "YYYY-MM".
   *  log — логарифмическая шкала (для роста «в разы»: удвоения, порядки);
   *  ticks — подписи шкалы Y (по умолчанию — степени десяти);
   *  highlight — точки с подписью прямо на графике (остальные — по наведению). */
  | {
      type: "line";
      title: string;
      subtitle?: string;
      log?: boolean;
      points: { date: string; label: string; value: number; display?: string; highlight?: boolean }[];
      ticks?: { value: number; label: string }[];
      source?: string;
    }
  /** Врезка «кстати» — интересный факт сбоку от основного повествования. */
  | { type: "fact"; text: string }
  | { type: "quote"; text: string; author?: string };

export type Research = {
  slug: string;
  title: string;
  /** Подзаголовок-лид: о чём и почему интересно, одна-две фразы. */
  dek: string;
  /** ISO-дата публикации; раньше неё исследование на сайте не видно. */
  date: string;
  topic: ResearchTopic;
  /** Это моё собственное исследование. */
  own?: boolean;
  source: { title: string; publisher: string; url: string; year?: number };
  readingMinutes: number;
  cover?: string;
  coverSize?: [number, number];
  /** Версия стиля превью (COVER_STYLE в scripts/research-cover.ts). Другая —
   *  превью перерисуется само при следующей синхронизации. */
  coverStyle?: string;
  /** Пиксельный спрайт — запасное превью кубиками (lib/voxel-cover.ts),
   *  если нейросеть недоступна. */
  coverSprite?: Sprite;
  /** Что изображено на превью-коллаже (по-английски): визуальная метафора
   *  статьи, без лиц и текста. Главный способ, см. scripts/research-cover.ts. */
  coverPrompt?: string;
  /** Что искать на стоке для превью (по-английски, 1–3 слова: «stopwatch»,
   *  «copper funnel»). Если есть — предмет берётся с фото Pexels, а не у нейросети. */
  coverQuery?: string;
  /** Настоящее фото для превью, которое нашёл агент: со стока (Pexels,
   *  Unsplash, Pixabay, Wikimedia Commons) или из самого исследования, если
   *  его картинки в общественном достоянии / CC0 / CC BY. Главный способ.
   *  mode: "cutout" — вырезать предмет (предметное фото), "full" — фото целиком
   *  как вклеенный снимок (сцена, иллюстрация из исследования). */
  coverImage?: {
    url: string;
    page: string;
    author: string;
    license: string;
    source: string;
    mode?: "cutout" | "full";
  };
  /** Автор фото на превью (заполняет scripts/research-cover.ts). */
  coverCredit?: { source: string; author: string; url: string; license?: string };
  /** Откуда взят закэшированный объект (subjects/<slug>.png): "image:<url>",
   *  "stock:<запрос>" или "ai:<промпт>". Не совпал с текущим — объект ищется заново. */
  coverSubjectPrompt?: string;
  blocks: ResearchBlock[];
  /** Не постить в Telegram-канал раньше этого времени (ISO). В канал всё
   *  равно уходит не больше одного поста в день — см. research-publish. */
  telegramAt?: string;
  /** Заполняется после публикации в Telegram-канал. */
  telegram?: {
    messageId: number;
    postedAt: string;
    /** С каким превью пост сейчас в канале; сменилось превью — пост обновится. */
    cover?: string;
  };
};

/** Текущая версия стиля превью. Превью другой версии перерисуются сами,
 *  а в канал исследование не уйдёт, пока превью не нового стиля. */
export const COVER_STYLE = "collage-5";

const DIR = path.join(process.cwd(), "content", "research");

export function getAllResearch({ includeFuture = false } = {}): Research[] {
  if (!fs.existsSync(DIR)) return [];
  const now = Date.now();
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Research)
    .filter((r) => includeFuture || new Date(r.date).getTime() <= now)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getResearch(slug: string): Research | null {
  return getAllResearch().find((r) => r.slug === slug) ?? null;
}

// ---- дайджест недели -------------------------------------------------------
// Исследования выходят по будням, в субботу — дайджест: что было за неделю.
// Файл content/research/digests/<slug>.json пишет субботний агент (см.
// AGENT.md), превью-коллаж из обложек недели и пост в канал — GitHub Action.

export type ResearchDigest = {
  /** Дата субботы: "2026-10-24". */
  slug: string;
  /** ISO, суббота 08:00 МСК. */
  date: string;
  title: string;
  /** Вступление — пара фраз о неделе (мини-markdown, как в блоке text). */
  intro: string;
  /** Исследования недели по порядку и короткий вывод по каждому. */
  items: { slug: string; takeaway: string }[];
  cover?: string;
  coverSize?: [number, number];
  /** Из каких обложек собран коллаж — сменились обложки, коллаж пересоберётся. */
  coverFrom?: string[];
  telegram?: { messageId: number; postedAt: string; cover?: string };
};

export const DIGEST_DIR = path.join(DIR, "digests");

export function getAllDigests({ includeFuture = false } = {}): ResearchDigest[] {
  if (!fs.existsSync(DIGEST_DIR)) return [];
  const now = Date.now();
  return fs
    .readdirSync(DIGEST_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIGEST_DIR, f), "utf8")) as ResearchDigest)
    .filter((d) => includeFuture || new Date(d.date).getTime() <= now)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getDigest(slug: string): ResearchDigest | null {
  return getAllDigests().find((d) => d.slug === slug) ?? null;
}

/** Смежные темы — для подборки «Ещё по теме», когда своей темы мало. */
const ADJACENT: Record<ResearchTopic, ResearchTopic[]> = {
  interfaces: ["cars", "gadgets", "brain", "ai"],
  ai: ["brain", "interfaces"],
  brain: ["interfaces", "ai"],
  market: ["b2b", "gadgets"],
  gadgets: ["interfaces", "market", "cars"],
  cars: ["interfaces", "gadgets"],
  b2b: ["market"],
};

const STOP = new Set(
  "это как что чем или при для над под без про все всё его она они мы вы так уже ещё еще был была были быть если когда тоже даже только раз год лет"
    .split(" ")
);

/** Грубые «основы» слов (первые 5 букв) из заголовка, лида и подзаголовков. */
function stems(r: Research): Set<string> {
  const text = [r.title, r.dek, ...r.blocks.map((b) => (b.type === "heading" ? b.text : ""))]
    .join(" ")
    .toLowerCase()
    .replace(/ё/g, "е");
  const out = new Set<string>();
  for (const w of text.match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(w.slice(0, 5));
  }
  return out;
}

/**
 * Похожие исследования: та же тема весит больше всего, смежная — меньше,
 * плюс общие слова (редкие по всему разделу весят больше частых).
 * При равенстве — свежие выше.
 */
export function getRelatedResearch(r: Research, limit = 3): Research[] {
  const all = getAllResearch().filter((x) => x.slug !== r.slug);
  const own = stems(r);
  const df = new Map<string, number>();
  const bags = new Map(all.map((x) => [x.slug, stems(x)]));
  for (const bag of bags.values()) for (const s of bag) df.set(s, (df.get(s) ?? 0) + 1);

  const score = (x: Research) => {
    let s = x.topic === r.topic ? 3 : ADJACENT[r.topic].includes(x.topic) ? 1 : 0;
    for (const w of bags.get(x.slug)!) if (own.has(w)) s += 1 / (df.get(w) ?? 1);
    return s;
  };
  return all
    .map((x) => ({ x, s: score(x) }))
    .sort((a, b) => b.s - a.s || b.x.date.localeCompare(a.x.date))
    .slice(0, limit)
    .map(({ x }) => x);
}
