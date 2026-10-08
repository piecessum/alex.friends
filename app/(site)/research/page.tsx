import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllResearch, TOPIC_COLORS, TOPICS } from "@/lib/research";
import { formatRuDate } from "@/lib/utils";

export const metadata = {
  title: "Исследования — Алексей Масюта",
};

export default function ResearchPage() {
  const items = getAllResearch();

  return (
    <main className="w-full flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Исследования</h1>
      <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
        Каждый день — небольшой обзор интересного исследования. Чтобы читать
        большие исследования, нужно выделить время, а ещё их надо найти. Тут
        всё собрано в кратком формате, а если очень понравится — в конце есть
        ссылка на оригинальную статью.
      </p>

      {items.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Здесь пока пусто.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((r, i) => (
            <Link
              key={r.slug}
              href={`/research/${r.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/50 transition hover:border-neutral-300 hover:shadow-lg hover:shadow-black/5 dark:border-neutral-700 dark:bg-[#181818]/50 dark:hover:border-neutral-700"
            >
              {r.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.cover}
                  alt=""
                  width={r.coverSize?.[0]}
                  height={r.coverSize?.[1]}
                  loading={i < 4 ? "eager" : "lazy"}
                  decoding="async"
                  // Пока превью грузится — фон цвета темы, как у самого превью.
                  style={{ background: TOPIC_COLORS[r.topic] }}
                  className="aspect-[3/2] w-full object-cover"
                />
              ) : (
                // Превью ещё не нарисовано — плашка цвета темы с её названием.
                <div
                  style={{ background: TOPIC_COLORS[r.topic] }}
                  className="flex aspect-[3/2] w-full items-end p-5 text-sm font-medium text-white/90"
                >
                  {TOPICS[r.topic]}
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
                  <span>
                    {formatRuDate(r.date)} · {r.readingMinutes} мин
                  </span>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wider dark:bg-neutral-900">
                    {r.own ? "моё" : TOPICS[r.topic]}
                  </span>
                </div>
                <h2 className="mt-1.5 font-semibold leading-snug tracking-tight transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {r.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {r.dek}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  Читать
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
