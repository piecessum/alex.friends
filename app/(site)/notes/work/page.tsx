import { NotesTabs } from "@/components/notes-tabs";
import { WorkGrid } from "@/components/work-grid";
import { getWorkPosts } from "@/lib/work-posts";
import { getAnnouncedPostIds, getNotesIndex } from "@/lib/notes";
import { getFeedPosts } from "@/lib/channel-posts";

export const metadata = {
  title: "Пишу для работы — Алексей Масюта",
};

export default async function NotesWorkPage() {
  const posts = getWorkPosts();
  // Счётчик вкладки «для себя» — как «Всё» на /notes: лонгриды + посты без анонсов.
  const announced = getAnnouncedPostIds();
  const selfCount =
    getNotesIndex().length +
    (await getFeedPosts()).filter((p) => !announced.has(p.id)).length;

  return (
    <main className="w-full flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Пишу</h1>
        <NotesTabs active="work" counts={{ self: selfCount, work: posts.length }} />
      </div>
      <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
        Кейсы, отчёты и истории внедрения — то, что пишу по работе. Сами тексты
        живут на сайте-резюме и в блоге B2B Движения.
      </p>

      <div className="mt-8">
        <WorkGrid posts={posts} />
      </div>
    </main>
  );
}
