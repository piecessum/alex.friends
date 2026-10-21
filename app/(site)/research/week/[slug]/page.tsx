import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ResearchBlocks } from "@/components/research-blocks";
import { getAllDigests, getDigest, getResearch, TOPIC_COLORS, TOPICS } from "@/lib/research";
import { formatRuDate } from "@/lib/utils";

export function generateStaticParams() {
  return getAllDigests().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = getDigest((await params).slug);
  if (!d) return { title: "Дайджест не найден" };
  return {
    title: `${d.title} — Алексей Масюта`,
    openGraph: { title: d.title, images: d.cover ? [d.cover] : [] },
  };
}

/** Дайджест недели: вступление и исследования недели с коротким выводом. */
export default async function DigestPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = getDigest((await params).slug);
  if (!d) notFound();
  const items = d.items
    .map((i) => ({ ...i, r: getResearch(i.slug) }))
    .filter((i) => i.r !== null);

  const back = (
    <Link
      href="/research"
      className="inline-flex items-center gap-1.5 text-ui text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
    >
      <ArrowLeft className="h-4 w-4" />
      Все исследования
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-[calc(40em+2*var(--page-x))] flex-1 px-page py-12 text-body sm:py-16">
      {back}

      <div className="mt-6 text-small text-neutral-500">
        {formatRuDate(d.date)} · дайджест недели
      </div>
      <h1 className="mt-3 text-h1 font-bold tracking-tight">{d.title}</h1>

      {d.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={d.cover}
          alt=""
          width={d.coverSize?.[0]}
          height={d.coverSize?.[1]}
          fetchPriority="high"
          className="mt-8 aspect-[3/2] w-full rounded-2xl bg-neutral-200 object-cover dark:bg-neutral-800"
        />
      )}

      <div className="mt-8">
        <ResearchBlocks blocks={[{ type: "text", md: d.intro }]} />
      </div>

      <ol className="mt-10 space-y-4">
        {items.map(({ r, takeaway }, n) => (
          <li key={r!.slug}>
            <Link
              href={`/research/${r!.slug}`}
              className="group flex gap-4 rounded-2xl border border-neutral-200 p-3 transition hover:border-neutral-300 hover:shadow-lg hover:shadow-black/5 sm:p-4 dark:border-neutral-700 dark:hover:border-neutral-600"
            >
              {r!.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r!.cover}
                  alt=""
                  loading="lazy"
                  style={{ background: TOPIC_COLORS[r!.topic] }}
                  className="aspect-[3/2] w-28 shrink-0 self-start rounded-xl object-cover sm:w-40"
                />
              )}
              <div className="min-w-0">
                <div className="text-small text-neutral-500">
                  {n + 1} · {TOPICS[r!.topic]} · {r!.readingMinutes} мин
                </div>
                <div className="mt-1 font-semibold leading-snug tracking-tight transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {r!.title}
                </div>
                <p className="mt-1.5 text-ui leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {takeaway}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-ui font-medium text-indigo-600 dark:text-indigo-400">
                  Читать
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-10">{back}</div>
    </main>
  );
}
