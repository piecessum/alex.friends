import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TelegraphContent } from "@/components/telegraph-content";
import { getNote, getNotesIndex, formatDate } from "@/lib/notes";

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

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Все лонгриды
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
          <a
            href={note.original}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Оригинал на Telegra.ph
          </a>
        </div>

        <article className="mt-8 text-[17px]">
          <TelegraphContent content={note.content} />
        </article>

        <div className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <Link
            href="/notes"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-600 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Ко всем лонгридам
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
