import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getNotesIndex, formatDate } from "@/lib/notes";

export const metadata = {
  title: "Лонгриды — Алексей Масюта",
};

export default function NotesPage() {
  const notes = getNotesIndex();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Заметки и лонгриды
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Разборы интерфейсов, заметки про UX и всякое из жизни — {notes.length}{" "}
          публикаций, перенесённых из Telegra.ph.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => {
            const date = formatDate(n.month, n.day, n.year);
            return (
              <Link
                key={n.slug}
                href={`/notes/${n.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/50 backdrop-blur transition hover:border-neutral-300 hover:shadow-lg hover:shadow-black/5 dark:border-neutral-800 dark:bg-neutral-950/50 dark:hover:border-neutral-700"
              >
                {n.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.cover}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover"
                  />
                ) : (
                  <div className="aspect-[16/9] w-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent" />
                )}

                <div className="flex flex-1 flex-col p-5">
                  {date && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-500">
                      {date}
                    </div>
                  )}
                  <h2 className="mt-1.5 font-semibold leading-snug tracking-tight transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {n.title}
                  </h2>
                  {n.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">
                      {n.excerpt}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    Читать
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
