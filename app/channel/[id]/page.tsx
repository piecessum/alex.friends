import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChannelPost } from "@/components/channel-post";
import { GraphWidget } from "@/components/graph-widget";
import { fetchAllPosts, type TgPost } from "@/lib/telegram";
import { getAnnouncedPostIds, getNotesIndex } from "@/lib/notes";
import { buildLocalGraph, buildTagGraph } from "@/lib/graph";

export const revalidate = 3600;

// Пререндерим страницы существующих постов — переход с плитки на /notes
// открывает их мгновенно. Новые посты добавятся при следующей сборке/ревалидации.
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  // Склеенный форвард доступен и по своему id, и по id поглощённой подписи.
  return posts.flatMap((p) => [p.id, ...(p.aliasIds ?? [])].map((id) => ({ id })));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Короткое описание поста для плитки навигации (с «…», если обрезано). */
function preview(post: TgPost): string {
  const text = stripHtml(post.html);
  if (text) return text.length > 80 ? text.slice(0, 80).trimEnd() + "…" : text;
  if (post.photos.length) return "Фото";
  if (post.videos.length) return "Видео";
  return "Пост";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const posts = await fetchAllPosts();
  const post = posts.find((p) => p.id === id || p.aliasIds?.includes(id));
  if (!post) return { title: "Пост не найден" };
  const text = stripHtml(post.html).slice(0, 60).trim();
  return { title: `${text || "Пост"} — Алексей Масюта` };
}

/**
 * Карточка перехода к соседнему посту. Заголовок «Предыдущий пост →» прижат
 * вправо (side="right"), текст превью всегда по левому краю.
 */
function NavLink({
  post,
  label,
  side,
  className = "",
}: {
  post: TgPost;
  label: string;
  side: "left" | "right";
  className?: string;
}) {
  const Arrow = side === "left" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={`/channel/${post.id}`}
      className={`group flex flex-col rounded-xl border border-neutral-200 bg-white/50 p-4 backdrop-blur transition hover:border-neutral-300 hover:shadow-md hover:shadow-black/5 dark:border-neutral-800 dark:bg-neutral-950/50 dark:hover:border-neutral-700 ${className}`}
    >
      <span
        className={`flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 ${
          side === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <Arrow className="h-4 w-4 shrink-0 transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
        {label}
      </span>
      <span className="mt-1.5 line-clamp-2 text-sm leading-snug text-neutral-700 transition group-hover:text-indigo-600 dark:text-neutral-300 dark:group-hover:text-indigo-400">
        {preview(post)}
      </span>
    </Link>
  );
}

export default async function ChannelItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const posts = await fetchAllPosts();
  const pos = posts.findIndex((p) => p.id === id || p.aliasIds?.includes(id));
  if (pos === -1) notFound();

  const post = posts[pos];
  // posts отсортированы по убыванию id (новые сверху):
  // следующий по списку — старее, предыдущий — новее.
  const newer = pos > 0 ? posts[pos - 1] : null;
  const older = pos < posts.length - 1 ? posts[pos + 1] : null;

  // Локальный граф: этот пост, его теги и соседи по тегам. Общий — для
  // переключателя локальный/общий в полноэкранном виде.
  const announced = getAnnouncedPostIds();
  const feed = posts.filter((p) => !announced.has(p.id));
  const notesIndex = getNotesIndex();
  const localGraph = buildLocalGraph(feed, notesIndex, `post:${post.id}`);
  const fullGraph = buildTagGraph(feed, notesIndex);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <GraphWidget
        data={localGraph}
        fullData={fullGraph}
        caption="Этот пост в графе"
        tagLabels
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
        <Link
          href="/notes"
          scroll={false}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>

        <div className="mt-6">
          <ChannelPost post={post} />
        </div>

        {(older || newer) && (
          <nav className="mt-12 grid gap-3 sm:grid-cols-2">
            {newer && (
              <NavLink post={newer} label="Следующий пост" side="left" />
            )}
            {older && (
              <NavLink
                post={older}
                label="Предыдущий пост"
                side="right"
                className={newer ? "" : "sm:col-start-2"}
              />
            )}
          </nav>
        )}

        <div className="mt-10">
          <Link
            href="/notes"
            scroll={false}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-600 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
