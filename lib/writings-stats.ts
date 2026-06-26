import type { NoteIndexItem } from "./notes";
import type { TgPost } from "./telegram";

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const MONTHS_NOM = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];
const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function postLength(html: string): number {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().length;
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export type StatsTagSlice = {
  tag: string;
  count: number;
  share: number; // 0..1 — доля от тегированных
};

export type StatsByYear = {
  year: number;
  posts: number;
  notes: number;
};

export type WritingsStats = {
  totals: {
    posts: number;
    notes: number;
    withMedia: number;
    forwarded: number;
    untaggedPosts: number;
  };
  byTag: StatsTagSlice[];
  byYear: StatsByYear[];
  byWeekday: { day: string; count: number }[];
  facts: {
    firstDate: string;
    lastDate: string;
    avgPostsPerMonth: number;
    busiestMonth: { label: string; count: number } | null;
    avgPostLength: number;
    longestPost: { id: string; length: number; preview: string } | null;
  };
};

export function computeWritingsStats(
  posts: TgPost[],
  notes: NoteIndexItem[]
): WritingsStats {
  // ── totals ────────────────────────────────────────────
  const withMedia = posts.filter((p) => p.photos.length || p.videos.length).length;
  const forwarded = posts.filter((p) => !!p.forward).length;
  const untaggedPosts = posts.filter((p) => p.tags.length === 0).length;

  // ── byTag (посты канала + лонгриды с тегами из подписи анонса) ─────────
  const tagCounts = new Map<string, number>();
  const bumpTag = (t: string) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  for (const p of posts) for (const t of p.tags) bumpTag(t);
  for (const n of notes) for (const t of n.tags ?? []) bumpTag(t);
  const taggedTotal = [...tagCounts.values()].reduce((a, b) => a + b, 0) || 1;
  const byTag: StatsTagSlice[] = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count, share: count / taggedTotal }))
    .sort((a, b) => b.count - a.count);

  // ── byYear (посты + лонгриды) ─────────────────────────
  const yearMap = new Map<number, { posts: number; notes: number }>();
  const touch = (year: number) => {
    if (!yearMap.has(year)) yearMap.set(year, { posts: 0, notes: 0 });
    return yearMap.get(year)!;
  };
  for (const p of posts) {
    if (!p.date) continue;
    const y = new Date(p.date).getFullYear();
    if (!Number.isFinite(y)) continue;
    touch(y).posts++;
  }
  for (const n of notes) {
    if (!n.year) continue;
    touch(n.year).notes++;
  }
  const byYear: StatsByYear[] = [...yearMap.entries()]
    .map(([year, v]) => ({ year, ...v }))
    .sort((a, b) => a.year - b.year);

  // ── byWeekday (Пн..Вс) ─────────────────────────────────
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Пн=0..Вс=6
  for (const p of posts) {
    if (!p.date) continue;
    const d = new Date(p.date).getDay(); // 0..6, Вс=0
    const idx = (d + 6) % 7;
    weekdayCounts[idx]++;
  }
  const byWeekday = WEEKDAYS.map((day, i) => ({ day, count: weekdayCounts[i] }));

  // ── facts ─────────────────────────────────────────────
  const dated = posts.filter((p) => p.date).map((p) => ({ p, t: new Date(p.date).getTime() }));
  dated.sort((a, b) => a.t - b.t);
  const firstDate = dated[0] ? formatDay(dated[0].p.date) : "";
  const lastDate = dated[dated.length - 1]
    ? formatDay(dated[dated.length - 1].p.date)
    : "";

  // Среднее постов в месяц от первого до последнего поста
  let avgPostsPerMonth = 0;
  if (dated.length > 1) {
    const first = new Date(dated[0].p.date);
    const last = new Date(dated[dated.length - 1].p.date);
    const months =
      (last.getFullYear() - first.getFullYear()) * 12 +
      (last.getMonth() - first.getMonth()) +
      1;
    avgPostsPerMonth = posts.length / Math.max(months, 1);
  }

  // Самый продуктивный месяц
  const monthCounts = new Map<string, number>();
  for (const p of posts) {
    if (!p.date) continue;
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
  }
  let busiestMonth: { label: string; count: number } | null = null;
  for (const [key, count] of monthCounts) {
    if (!busiestMonth || count > busiestMonth.count) {
      const [yy, mm] = key.split("-").map(Number);
      busiestMonth = { label: `${MONTHS_NOM[mm]} ${yy}`, count };
    }
  }

  // Средняя длина и самый длинный
  let total = 0;
  let nonEmpty = 0;
  let longest: { id: string; length: number; preview: string } | null = null;
  for (const p of posts) {
    const len = postLength(p.html);
    if (len > 0) {
      total += len;
      nonEmpty++;
    }
    if (!longest || len > longest.length) {
      longest = {
        id: p.id,
        length: len,
        preview: p.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80),
      };
    }
  }
  const avgPostLength = nonEmpty ? Math.round(total / nonEmpty) : 0;

  return {
    totals: {
      posts: posts.length,
      notes: notes.length,
      withMedia,
      forwarded,
      untaggedPosts,
    },
    byTag,
    byYear,
    byWeekday,
    facts: {
      firstDate,
      lastDate,
      avgPostsPerMonth,
      busiestMonth,
      avgPostLength,
      longestPost: longest,
    },
  };
}
