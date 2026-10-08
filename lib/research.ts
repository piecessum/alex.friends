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
  /** С каким coverPrompt нарисован закэшированный объект (subjects/<slug>.png). */
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
export const COVER_STYLE = "collage-4";

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
