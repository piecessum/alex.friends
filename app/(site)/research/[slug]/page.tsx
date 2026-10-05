import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ResearchBlocks } from "@/components/research-blocks";
import { getAllResearch, getResearch, TOPICS } from "@/lib/research";
import { formatRuDate } from "@/lib/utils";

export function generateStaticParams() {
  return getAllResearch().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const r = getResearch((await params).slug);
  if (!r) return { title: "Исследование не найдено" };
  return {
    title: `${r.title} — Алексей Масюта`,
    description: r.dek,
    openGraph: { title: r.title, description: r.dek, images: r.cover ? [r.cover] : [] },
  };
}

export default async function ResearchItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = getResearch((await params).slug);
  if (!r) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
      <Link
        href="/research"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Все исследования
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span>{formatRuDate(r.date)}</span>
        <span>·</span>
        <span>{r.readingMinutes} мин</span>
        <span>·</span>
        <span>{TOPICS[r.topic]}</span>
        {r.own && (
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            моё исследование
          </span>
        )}
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{r.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">{r.dek}</p>

      {r.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.cover}
          alt=""
          width={r.coverSize?.[0]}
          height={r.coverSize?.[1]}
          fetchPriority="high"
          className="mt-8 aspect-[3/2] w-full rounded-2xl bg-neutral-200/60 object-cover dark:bg-neutral-800/60"
        />
      )}

      <div className="mt-10">
        <ResearchBlocks blocks={r.blocks} />
      </div>

      <a
        href={r.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-12 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-5 transition hover:border-indigo-400 dark:border-neutral-700 dark:hover:border-indigo-500"
      >
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Оригинал{r.source.year ? ` · ${r.source.year}` : ""}
          </div>
          <div className="mt-1 font-semibold leading-snug transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            {r.source.title}
          </div>
          <div className="mt-0.5 text-sm text-neutral-500">{r.source.publisher}</div>
        </div>
        <ArrowUpRight className="h-5 w-5 shrink-0 text-neutral-400 transition group-hover:text-indigo-500" />
      </a>
    </main>
  );
}
