import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "content", "notes");

export type NoteNode =
  | string
  | { tag: string; attrs?: Record<string, string>; children?: NoteNode[] };

export type NoteIndexItem = {
  slug: string;
  title: string;
  month: number;
  day: number;
  excerpt: string;
  cover: string | null;
};

export type Note = {
  slug: string;
  title: string;
  author: string;
  views: number;
  month: number;
  day: number;
  original: string;
  content: NoteNode[];
};

export function getNotesIndex(): NoteIndexItem[] {
  return JSON.parse(fs.readFileSync(path.join(DIR, "index.json"), "utf8"));
}

export function getNote(slug: string): Note {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${slug}.json`), "utf8"));
}

const MONTHS = [
  "",
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function formatDate(month: number, day: number): string {
  if (!month || !day) return "";
  return `${day} ${MONTHS[month]}`;
}
