import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VinylFlip } from "@/components/vinyl-flip";
import { getAllVinylItems, getVinylItem } from "@/lib/vinyl";

export function generateStaticParams() {
  return getAllVinylItems().map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getVinylItem(slug);
  return { title: item ? `${item.title} — пластинки` : "Пластинка не найдена" };
}

export default async function VinylItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getVinylItem(slug);
  if (!item) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <Link
          href="/vinyl"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Все пластинки
        </Link>

        <h1 className="mt-6 mb-8 text-3xl font-bold tracking-tight sm:text-4xl">
          {item.title}
        </h1>

        <VinylFlip title={item.title} want={item.want} />

        <section className="mt-12">
          <h2 className="text-lg font-bold tracking-tight">
            {item.want ? "В списке желаемого" : "Список треков"}
          </h2>

          {item.want ? (
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              Этой пластинки пока нет в коллекции — она в вишлисте.
            </p>
          ) : item.tracks.length ? (
            <ol className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
              {item.tracks.map((track, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-3 py-2.5 text-neutral-700 dark:text-neutral-300"
                >
                  <span className="w-6 shrink-0 text-right text-sm tabular-nums text-neutral-400 dark:text-neutral-600">
                    {i + 1}
                  </span>
                  <span>{track}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              Список треков не указан.
            </p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
