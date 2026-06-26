import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChannelPost } from "@/components/channel-post";
import { fetchAllPosts, type TgPost } from "@/lib/telegram";

export const revalidate = 3600;

// Пререндерим страницы существующих постов — переход с плитки на /notes
// открывает их мгновенно. Новые посты добавятся при следующей сборке/ревалидации.
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return posts.map((p) => ({ id: p.id }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Короткое описание поста для плитки навигации. */
function preview(post: TgPost): string {
  const text = stripHtml(post.html);
  if (text) return text.slice(0, 80);
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
  const post = posts.find((p) => p.id === id);
  if (!post) return { title: "Пост не найден" };
  const text = stripHtml(post.html).slice(0, 60).trim();
  return { title: `${text || "Пост"} — Алексей Масюта` };
}

/** Текстовая ссылка перехода к соседнему посту (стрелка снаружи). */
function NavLink({
  post,
  label,
  side,
}: {
  post: TgPost;
  label: string;
  side: "left" | "right";
}) {
  const Arrow = side === "left" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={`/channel/${post.id}`}
      className={`group flex max-w-[47%] items-start gap-2.5 ${
        side === "right" ? "ml-auto flex-row-reverse text-right" : ""
      }`}
    >
      <Arrow className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
        <span className="mt-1 block line-clamp-2 text-sm leading-snug text-neutral-700 transition group-hover:text-indigo-600 dark:text-neutral-300 dark:group-hover:text-indigo-400">
          {preview(post)}
        </span>
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
  const pos = posts.findIndex((p) => p.id === id);
  if (pos === -1) notFound();

  const post = posts[pos];
  // posts отсортированы по убыванию id (новые сверху):
  // следующий по списку — старее, предыдущий — новее.
  const newer = pos > 0 ? posts[pos - 1] : null;
  const older = pos < posts.length - 1 ? posts[pos + 1] : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
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
          <nav className="mt-12 flex gap-6">
            {newer ? (
              <NavLink post={newer} label="Следующий пост" side="left" />
            ) : (
              <span />
            )}
            {older && <NavLink post={older} label="Предыдущий пост" side="right" />}
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
