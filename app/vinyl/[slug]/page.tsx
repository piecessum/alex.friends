import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VinylBox } from "@/components/vinyl-box";
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
      {/* Десктоп: слева назад + 3D-коробка, справа заголовок и описание.
          Мобилка: то же стопкой (назад → коробка → заголовок → описание). */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
        {/* Левая колонка */}
        <div>
          <Link
            href="/vinyl"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Все пластинки
          </Link>

          <div className="mt-6">
            <VinylBox
              title={item.title}
              want={item.want}
              tracks={item.tracks}
              description={item.description}
              front={item.front}
              back={item.back}
            />
          </div>
        </div>

        {/* Правая колонка */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {item.title}
          </h1>

          <div className="mt-8 space-y-8">
            {/* Интересное об издании/пластинке — показываем, если есть */}
            {item.description?.length ? (
              <section>
                <h2 className="text-lg font-bold tracking-tight">Об издании</h2>
                <div className="mt-4 space-y-3 text-neutral-700 dark:text-neutral-300">
                  {item.description.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Список треков — отдельной секцией, если есть */}
            {item.tracks.length ? (
              <section>
                <h2 className="text-lg font-bold tracking-tight">Список треков</h2>
                <ol className="mt-4">
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
              </section>
            ) : null}

            {/* Ни описания, ни треков */}
            {!item.description?.length && !item.tracks.length ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {item.want
                  ? "Этой пластинки пока нет в коллекции — она в вишлисте."
                  : "Список треков не указан."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
