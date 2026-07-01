import { Eye, ArrowUpRight, CornerUpRight } from "lucide-react";
import { PostMedia } from "@/components/post-media";
import type { TgPost } from "@/lib/telegram";
import { getNotesIndex } from "@/lib/notes";
import {
  internalizeTelegraphLinks,
  internalizeTelegraphUrl,
} from "@/lib/telegraph-links";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Общий стиль текста поста — используем и для комментария, и для текста форварда.
const bodyClass =
  "whitespace-pre-line leading-relaxed break-words text-neutral-800 [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 dark:text-neutral-200 dark:[&_a]:text-indigo-400";

export function ChannelPost({ post }: { post: TgPost }) {
  // Ссылки на telegra.ph, у которых есть лонгрид на сайте, ведём внутрь.
  const slugs = new Set(getNotesIndex().map((n) => n.slug));
  const html = internalizeTelegraphLinks(post.html, slugs);
  const comment = post.comment
    ? internalizeTelegraphLinks(post.comment, slugs)
    : "";
  const linkHref = internalizeTelegraphUrl(post.link?.url, slugs) || post.url;
  const linkInternal = linkHref.startsWith("/");

  return (
    <article>
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
        <span>{formatDate(post.date)}</span>
        {post.views && (
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {post.views}
          </span>
        )}
      </div>

      {/* Твой комментарий к пересылке — твоим голосом, над самой цитатой. */}
      {post.forward && comment && (
        <div
          className={`mt-5 text-[17px] ${bodyClass}`}
          dangerouslySetInnerHTML={{ __html: comment }}
        />
      )}

      {post.forward ? (
        // Пересланный пост оформляем как цитату: шапка «Переслано из…» и,
        // если у форварда был свой текст, — сам текст под ней.
        <div className="mt-4 rounded-lg border-l-2 border-indigo-400 bg-indigo-500/5 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <CornerUpRight className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
            <span>
              Переслано из{" "}
              {post.forward.url ? (
                <a
                  href={post.forward.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {post.forward.name}
                </a>
              ) : (
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {post.forward.name}
                </span>
              )}
            </span>
          </div>
          {post.html && (
            <div
              className={`mt-2 text-[16px] ${bodyClass}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      ) : (
        post.html && (
          <div
            className={`mt-5 text-[17px] ${bodyClass}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      )}

      <PostMedia photos={post.photos} videos={post.videos} url={post.url} />

      {post.link && (post.link.title || post.link.image) && (
        <a
          href={linkHref}
          target={linkInternal ? undefined : "_blank"}
          rel={linkInternal ? undefined : "noopener noreferrer"}
          className="mt-4 flex gap-3 rounded-xl border border-neutral-200 p-3 transition hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
        >
          {post.link.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.link.image}
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0">
            {post.link.site && (
              <div className="text-xs text-neutral-400">{post.link.site}</div>
            )}
            {post.link.title && (
              <div className="line-clamp-1 text-sm font-semibold">{post.link.title}</div>
            )}
            {post.link.description && (
              <div className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                {post.link.description}
              </div>
            )}
          </div>
        </a>
      )}

      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs text-neutral-400 transition hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        в Telegram
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </article>
  );
}
