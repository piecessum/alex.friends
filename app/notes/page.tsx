import Link from "next/link";
import { ArrowLeft, PieChart } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WritingsGrid } from "@/components/writings-grid";
import { getAnnouncedPostIds, getNotesIndex } from "@/lib/notes";
import { fetchAllPosts } from "@/lib/telegram";

// ISR: страница рендерится при сборке и обновляется не чаще раза в час.
// Это даёт мгновенный переход с главной — Next отдаёт HTML из кэша,
// а посты из Telegram подтянутся в следующем окне ревалидации.
export const revalidate = 3600;

export const metadata = {
  title: "Пишу — Алексей Масюта",
};

export default async function NotesPage() {
  const notes = getNotesIndex();
  // Посты-анонсы лонгридов прячем — на сайте их «представляет» сам лонгрид.
  const announced = getAnnouncedPostIds();
  const posts = (await fetchAllPosts()).filter((p) => !announced.has(p.id));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Пишу
          </h1>
          <Link
            href="/notes/stats"
            aria-label="Статистика"
            title="Статистика"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white/60 text-neutral-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
          >
            <PieChart className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Ох тут столько всякого: шиза, интересное, неинтересное, матерюсь
          еще...
        </p>

        <div className="mt-8">
          <WritingsGrid notes={notes} posts={posts} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
