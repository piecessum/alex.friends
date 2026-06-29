import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatsDashboard, StatsTotals } from "@/components/stats-dashboard";
import { GraphFrame } from "@/components/graph-frame";
import { getAnnouncedPostIds, getNotesIndex } from "@/lib/notes";
import { fetchAllPosts } from "@/lib/telegram";
import { computeWritingsStats } from "@/lib/writings-stats";
import { buildTagGraph } from "@/lib/graph";

export const revalidate = 3600;

export const metadata = {
  title: "Статистика — Пишу — Алексей Масюта",
};

export default async function WritingsStatsPage() {
  const notes = getNotesIndex();
  // Посты-анонсы лонгридов не считаем — иначе один материал учтётся дважды.
  const announced = getAnnouncedPostIds();
  const posts = (await fetchAllPosts()).filter((p) => !announced.has(p.id));
  const stats = computeWritingsStats(posts, notes);
  const graph = buildTagGraph(posts, notes);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="w-full flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Статистика
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Что и сколько я тут написал.
        </p>

        {/* Граф слева, ключевые цифры столбиком справа */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border border-neutral-200 bg-white/40 backdrop-blur lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-950/40">
            <GraphFrame data={graph} caption="Граф связей" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:h-[60vh] lg:min-h-[420px] lg:grid-cols-1 lg:grid-rows-4">
            <StatsTotals stats={stats} />
          </div>
        </div>

        <div className="mt-12">
          <StatsDashboard stats={stats} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
