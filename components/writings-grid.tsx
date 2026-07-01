"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { NoteIndexItem } from "@/lib/notes";
import type { TgPost } from "@/lib/telegram";
import { postBody } from "@/lib/post-text";

const KEY_FILTER = "writingsFilter";
const KEY_SCROLL = "writingsScroll";
const KEY_RESTORE = "writingsRestore";

// Категории-хэштеги в авторском порядке. Остальные найденные теги
// добавляются в конец списка автоматически.
const TAG_ORDER = [
  "ux",
  "проект",
  "видео",
  "хорошо",
  "плохо",
  "наскругляли",
  "исправил",
  "мысль",
  "цитата",
  "уродство",
  "итоги",
];

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatPostDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNoteDate(month: number, day: number, year?: number): string {
  if (!month || !day) return year ? String(year) : "";
  return `${day} ${MONTHS[month - 1]}${year ? ` ${year}` : ""}`;
}

/** Сводит html-текст поста к читаемой строке без тегов и хэштегов. */
function postExcerpt(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/#[\p{L}\p{N}_]+/giu, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

type Tile =
  | {
      kind: "note";
      key: string;
      href: string;
      sortDate: number;
      cover: string | null;
      date: string;
      title: string;
      excerpt: string;
      tags: string[];
    }
  | {
      kind: "post";
      key: string;
      href: string;
      sortDate: number;
      cover: string | null;
      date: string;
      text: string;
      tags: string[];
    };

function buildTiles(notes: NoteIndexItem[], posts: TgPost[]): Tile[] {
  const tiles: Tile[] = [
    ...notes.map<Tile>((n) => ({
      kind: "note",
      key: `note-${n.slug}`,
      href: `/notes/${n.slug}`,
      sortDate: new Date(n.year || 2020, (n.month || 1) - 1, n.day || 1).getTime(),
      cover: n.cover,
      date: formatNoteDate(n.month, n.day, n.year),
      title: n.title,
      excerpt: n.excerpt,
      tags: n.tags ?? [],
    })),
    ...posts.map<Tile>((p) => ({
      kind: "post",
      key: `post-${p.id}`,
      href: `/channel/${p.id}`,
      sortDate: new Date(p.date).getTime() || 0,
      cover: p.photos[0] || p.videos[0]?.thumb || null,
      date: formatPostDate(p.date),
      text: postExcerpt(postBody(p)),
      tags: p.tags,
    })),
  ];
  tiles.sort((a, b) => b.sortDate - a.sortDate);
  return tiles;
}

export function WritingsGrid({
  notes,
  posts,
}: {
  notes: NoteIndexItem[];
  posts: TgPost[];
}) {
  const tiles = React.useMemo(() => buildTiles(notes, posts), [notes, posts]);

  const tagChips = React.useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (t: string) => counts.set(t, (counts.get(t) || 0) + 1);
    for (const p of posts) for (const t of p.tags) bump(t);
    for (const n of notes) for (const t of n.tags ?? []) bump(t);
    const ordered: { tag: string; count: number }[] = [];
    const used = new Set<string>();
    for (const t of TAG_ORDER) {
      if (counts.has(t)) {
        ordered.push({ tag: t, count: counts.get(t)! });
        used.add(t);
      }
    }
    for (const [t, c] of counts) if (!used.has(t)) ordered.push({ tag: t, count: c });
    return ordered;
  }, [posts, notes]);

  const [filter, setFilter] = React.useState<string>("all");

  // Возврат с детальной страницы: восстановить фильтр и позицию скролла.
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY_RESTORE) !== "1") return;
      sessionStorage.removeItem(KEY_RESTORE);
      const f = sessionStorage.getItem(KEY_FILTER);
      if (f) setFilter(f);
      const y = Number(sessionStorage.getItem(KEY_SCROLL) || 0);
      if (y) requestAnimationFrame(() => window.scrollTo(0, y));
    } catch {
      /* sessionStorage недоступен — просто открываем страницу сверху */
    }
  }, []);

  // Постоянно пишем позицию скролла, чтобы при клике по плитке знать, куда вернуться.
  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        try {
          sessionStorage.setItem(KEY_SCROLL, String(window.scrollY));
        } catch {}
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const saveStateForReturn = () => {
    try {
      sessionStorage.setItem(KEY_FILTER, filter);
      sessionStorage.setItem(KEY_SCROLL, String(window.scrollY));
      sessionStorage.setItem(KEY_RESTORE, "1");
    } catch {}
  };

  const pickFilter = (key: string) => {
    setFilter(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const visible = React.useMemo(() => {
    if (filter === "all") return tiles;
    if (filter === "longreads") return tiles.filter((t) => t.kind === "note");
    // По тегу — и посты, и лонгриды с этим хэштегом.
    return tiles.filter((t) => t.tags.includes(filter));
  }, [tiles, filter]);

  const renderChip = (key: string, label: string, count: number) => {
    const active = filter === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => pickFilter(key)}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
          active
            ? "border-indigo-500 bg-indigo-500 text-white"
            : "border-neutral-200 bg-white/60 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-300"
        }`}
      >
        {label} <span className="opacity-60">{count}</span>
      </button>
    );
  };

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {renderChip("all", "Всё", tiles.length)}
        {renderChip("longreads", "Лонгриды", notes.length)}
        {tagChips.map(({ tag, count }) => renderChip(tag, `#${tag}`, count))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Здесь пока пусто.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              onClick={saveStateForReturn}
              className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/50 backdrop-blur transition hover:border-neutral-300 hover:shadow-lg hover:shadow-black/5 dark:border-neutral-800 dark:bg-neutral-950/50 dark:hover:border-neutral-700"
            >
              {t.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.cover}
                  alt=""
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div className="aspect-[16/9] w-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent" />
              )}

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
                  <span>{t.date}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wider dark:bg-neutral-900">
                    {t.kind === "note" ? "лонгрид" : "пост"}
                  </span>
                </div>

                {t.kind === "note" ? (
                  <>
                    <h2 className="mt-1.5 font-semibold leading-snug tracking-tight transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {t.title}
                    </h2>
                    {t.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">
                        {t.excerpt}
                      </p>
                    )}
                    {t.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
                        {t.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs text-indigo-600 dark:text-indigo-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-1.5 line-clamp-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {t.text || "(без текста)"}
                    </p>
                    {t.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
                        {t.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs text-indigo-600 dark:text-indigo-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {t.kind === "note" ? "Читать" : "Открыть"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
