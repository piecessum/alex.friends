import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TelegraphContent } from "@/components/telegraph-content";
import { GraphWidget } from "@/components/graph-widget";
import {
  getNote,
  getNotesIndex,
  getAnnouncedPostIds,
  getRelatedNotes,
  formatDate,
} from "@/lib/notes";
import { fetchAllPosts } from "@/lib/telegram";
import { buildLocalGraph, buildTagGraph } from "@/lib/graph";

// Локальный граф тянет ленту канала — обновляем не чаще раза в час.
export const revalidate = 3600;

export function generateStaticParams() {
  return getNotesIndex().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const note = getNote(slug);
    return { title: `${note.title} — Алексей Масюта` };
  } catch {
    return { title: "Заметка не найдена" };
  }
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let note;
  try {
    note = getNote(slug);
  } catch {
    notFound();
  }

  const date = formatDate(note.month, note.day, note.year);
  const related = getRelatedNotes(slug, 3);

  // Локальный граф: этот лонгрид, его теги и соседи по тегам. Общий — для
  // переключателя локальный/общий в полноэкранном виде.
  const announced = getAnnouncedPostIds();
  const feed = (await fetchAllPosts()).filter((p) => !announced.has(p.id));
  const notesIndex = getNotesIndex();
  const localGraph = buildLocalGraph(feed, notesIndex, `note:${slug}`);
  const fullGraph = buildTagGraph(feed, notesIndex);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <GraphWidget
        data={localGraph}
        fullData={fullGraph}
        caption="Этот лонгрид в графе"
        tagLabels
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
        <Link
          href="/notes"
          scroll={false}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          {note.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
          {date && <span>{date}</span>}
          {note.views > 0 && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {note.views}
            </span>
          )}
        </div>

        <article className="mt-8 text-[17px]">
          <TelegraphContent
            content={note.content}
            noteSlugs={getNotesIndex().map((n) => n.slug)}
          />
        </article>

        {related.length > 0 && (
          <section className="mt-14 border-t border-neutral-200 pt-8 dark:border-neutral-800">
            <h2 className="text-xl font-bold tracking-tight">Читать ещё</h2>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {related.map((r) => {
                const rdate = formatDate(r.month, r.day, r.year);
                return (
                  <Link
                    key={r.slug}
                    href={`/notes/${r.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white/50 backdrop-blur transition hover:border-neutral-300 hover:shadow-md hover:shadow-black/5 dark:border-neutral-800 dark:bg-neutral-950/50 dark:hover:border-neutral-700"
                  >
                    {r.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.cover}
                        alt=""
                        loading="lazy"
                        className="aspect-[16/9] w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-[16/9] w-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent" />
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      {rdate && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-500">
                          {rdate}
                        </div>
                      )}
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug tracking-tight transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {r.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <Link
            href="/notes"
            scroll={false}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-600 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
