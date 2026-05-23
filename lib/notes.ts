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
  year: number;
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
  year: number;
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

export function formatDate(month: number, day: number, year?: number): string {
  if (!month || !day) return year ? String(year) : "";
  return `${day} ${MONTHS[month]}${year ? ` ${year}` : ""}`;
}

// ─── Подбор похожих статей («Читать ещё») ────────────────────────────────────

const STOPWORDS = new Set([
  "это", "как", "что", "для", "при", "его", "она", "они", "был", "было",
  "были", "быть", "есть", "или", "под", "над", "без", "про", "том", "так",
  "все", "всё", "ещё", "уже", "себя", "свой", "своё", "свои", "этот", "эта",
  "эти", "тот", "там", "тут", "вот", "если", "чтобы", "когда", "очень",
  "можно", "нужно", "тоже", "также", "когда", "более", "менее", "просто",
  "потом", "после", "перед", "между", "через", "будет", "будут", "может",
  "меня", "тебя", "него", "неё", "них", "сам", "сама", "сами", "который",
  "которые", "которая", "которое", "этого", "этом", "than", "this", "that",
  "with", "from", "have", "they",
]);

/** Плоский текст узлов — для индекса похожести. */
function plainText(nodes: NoteNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => (typeof n === "string" ? n : plainText(n.children)))
    .join(" ");
}

/** Токены (слова ≥4 букв, без стоп-слов, ё→е). */
function tokenize(text: string): string[] {
  return (text.toLowerCase().replace(/ё/g, "е").match(/[a-zа-я]{4,}/g) || [])
    .filter((w) => !STOPWORDS.has(w));
}

type Vec = Map<string, number>;

let _vectors: Map<string, Vec> | null = null;

/** TF-вектора всех статей (заголовок весит больше). Считается один раз. */
function getVectors(): Map<string, Vec> {
  if (_vectors) return _vectors;
  _vectors = new Map();
  for (const item of getNotesIndex()) {
    const note = getNote(item.slug);
    const vec: Vec = new Map();
    const add = (text: string, weight: number) => {
      for (const t of tokenize(text)) vec.set(t, (vec.get(t) || 0) + weight);
    };
    add(note.title, 3); // заголовок важнее
    add(plainText(note.content), 1);
    _vectors.set(item.slug, vec);
  }
  return _vectors;
}

function cosine(a: Vec, b: Vec): number {
  let dot = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, v] of small) dot += v * (big.get(t) || 0);
  if (!dot) return 0;
  const norm = (v: Vec) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  return dot / (norm(a) * norm(b) || 1);
}

/**
 * До `count` статей для блока «Читать ещё»: сначала самые близкие по смыслу,
 * затем — если близких мало — соседние по списку (следующая/предыдущая).
 */
export function getRelatedNotes(slug: string, count = 3): NoteIndexItem[] {
  const index = getNotesIndex();
  const pos = index.findIndex((n) => n.slug === slug);
  if (pos === -1) return [];

  const vectors = getVectors();
  const target = vectors.get(slug)!;

  const scored = index
    .filter((n) => n.slug !== slug)
    .map((n) => ({ item: n, score: cosine(target, vectors.get(n.slug)!) }))
    .sort((a, b) => b.score - a.score);

  const picked: NoteIndexItem[] = [];
  const used = new Set<string>([slug]);

  // 1) по контексту (порог отсекает случайные пересечения)
  for (const { item, score } of scored) {
    if (picked.length >= count) break;
    if (score > 0.04) {
      picked.push(item);
      used.add(item.slug);
    }
  }

  // 2) добиваем соседями по списку
  for (let d = 1; picked.length < count && d < index.length; d++) {
    for (const i of [pos + d, pos - d]) {
      if (i >= 0 && i < index.length && !used.has(index[i].slug)) {
        picked.push(index[i]);
        used.add(index[i].slug);
        if (picked.length >= count) break;
      }
    }
  }

  return picked;
}
