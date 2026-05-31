import { Play, Eye, ArrowUpRight, CornerUpRight } from "lucide-react";
import type { TgPost } from "@/lib/telegram";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function Media({ post }: { post: TgPost }) {
  const tiles = [
    ...post.photos.map((src) => ({ src, video: false, duration: undefined as string | undefined })),
    ...post.videos.map((v) => ({ src: v.thumb, video: true, duration: v.duration })),
  ].filter((t) => t.src || t.video);

  if (tiles.length === 0) return null;

  return (
    <div
      className={`mt-4 grid gap-1.5 overflow-hidden rounded-xl ${
        tiles.length > 1 ? "grid-cols-2" : "grid-cols-1"
      }`}
    >
      {tiles.map((t, i) => (
        <a
          key={i}
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/media relative block aspect-video bg-neutral-200 dark:bg-neutral-800"
        >
          {t.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.src} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              видео
            </div>
          )}
          {t.video && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition group-hover/media:scale-110">
                <Play className="h-5 w-5 translate-x-0.5 fill-current" />
              </span>
              {t.duration && (
                <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {t.duration}
                </span>
              )}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

export function ChannelPost({ post }: { post: TgPost }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white/50 p-6 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/50">
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
        <span>{formatDate(post.date)}</span>
        {post.views && (
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {post.views}
          </span>
        )}
      </div>

      {post.forward && (
        <div className="mt-4 flex items-center gap-1.5 rounded-lg border-l-2 border-indigo-400 bg-indigo-500/5 py-1.5 pr-2 pl-2.5 text-xs text-neutral-500 dark:text-neutral-400">
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
      )}

      {post.html && (
        <div
          className="mt-4 whitespace-pre-line text-[16px] leading-relaxed break-words text-neutral-800 [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 dark:text-neutral-200 dark:[&_a]:text-indigo-400"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      )}

      <Media post={post} />

      {post.link && (post.link.title || post.link.image) && (
        <a
          href={post.link.url || post.url}
          target="_blank"
          rel="noopener noreferrer"
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
