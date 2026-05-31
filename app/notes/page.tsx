import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WritingsGrid } from "@/components/writings-grid";
import { getNotesIndex } from "@/lib/notes";
import { fetchAllPosts } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Пишу — Алексей Масюта",
};

export default async function NotesPage() {
  const notes = getNotesIndex();
  const posts = await fetchAllPosts();

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

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Пишу
        </h1>
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
