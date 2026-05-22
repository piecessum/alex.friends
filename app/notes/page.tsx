import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
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
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          Разборы интерфейсов, заметки про UX и всякое из жизни — {notes.length}{" "}
          публикаций, перенесённых из Telegra.ph.
        </p>

        <div className="mt-10 flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
          {notes.map((n) => {
            const date = formatDate(n.month, n.day, n.year);
            return (
              <Link
                key={n.slug}
                href={`/notes/${n.slug}`}
                className="group flex gap-4 py-5 first:pt-0"
              >
                {n.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.cover}
                    alt=""
                    loading="lazy"
                    className="hidden h-20 w-28 shrink-0 rounded-lg border border-neutral-200 object-cover sm:block dark:border-neutral-800"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold tracking-tight transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {n.title}
                  </h2>
                  {date && (
                    <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
                      {date}
                    </div>
                  )}
                  {n.excerpt && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {n.excerpt}
                    </p>
                  )}
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
