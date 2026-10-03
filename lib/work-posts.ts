// Превью рабочих текстов для вкладки «для работы» (/notes/work): статьи и
// кейсы на wiki.tridavinci.org и кейсы с сайта-резюме. Сами тексты живут
// там — здесь только карточка со ссылкой. Собирает scripts/sync-work.ts.

import fs from "node:fs";
import path from "node:path";

export type WorkPost = {
  id: string;
  source: "tridavinci" | "resume";
  href: string;
  title: string;
  excerpt: string;
  /** YYYY-MM-DD, если известна. */
  date?: string;
  /** Рубрика: «История успеха», «Отчёт», «Системный анализ»… */
  tag?: string;
  cover?: string;
  coverSize?: [number, number];
};

export const WORK_SOURCES: Record<WorkPost["source"], string> = {
  tridavinci: "B2B Движение",
  resume: "Кейс в резюме",
};

const FILE = path.join(process.cwd(), "content", "work-posts.json");

export function getWorkPosts(): WorkPost[] {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
