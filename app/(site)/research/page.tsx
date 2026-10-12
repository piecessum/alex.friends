import { ResearchCard } from "@/components/research-card";
import { getAllResearch } from "@/lib/research";

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
            <ResearchCard key={r.slug} r={r} eager={i < 4} />
          ))}
        </div>
      )}
    </main>
  );
}
