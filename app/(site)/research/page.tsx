import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ResearchCard } from "@/components/research-card";
import { getAllDigests, getAllResearch } from "@/lib/research";

export const metadata = {
  title: "Исследования — Алексей Масюта",
};

export default function ResearchPage() {
  const items = getAllResearch();
  const digest = getAllDigests()[0];

  return (
    <main className="w-full flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Исследования</h1>
      <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
        По будням — небольшой обзор интересного исследования, по субботам —
        дайджест недели. Чтобы читать
        большие исследования, нужно выделить время, а ещё их надо найти. Тут
        всё собрано в кратком формате, а если очень понравится — в конце есть
        ссылка на оригинальную статью.
      </p>

      {digest && (
        <Link
          href={`/research/week/${digest.slug}`}
          className="group mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/60 px-4 py-2 text-sm transition hover:border-indigo-400 dark:border-neutral-700 dark:bg-[#181818]/60 dark:hover:border-indigo-500"
        >
          <span className="font-medium">{digest.title}</span>
          <ArrowRight className="h-4 w-4 text-indigo-600 transition group-hover:translate-x-0.5 dark:text-indigo-400" />
        </Link>
      )}

      {items.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Здесь пока пусто.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((r, i) => (
            <ResearchCard key={r.slug} r={r} eager={i < 4} />
          ))}
        </div>
      )}
    </main>
  );
}
