import { ArrowUpRight } from "lucide-react";
import { WORK_SOURCES, type WorkPost } from "@/lib/work-posts";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * Карточки рабочих текстов: обложка, источник, рубрика, заголовок, пара строк
 * описания и ссылка на сам текст (он живёт на другом сайте — открываем в
 * новой вкладке). Без обложки — карточка просто текстовая.
 */
export function WorkGrid({ posts }: { posts: WorkPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="mt-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Здесь пока пусто.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {posts.map((p, i) => (
        <a
          key={p.id}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/50 backdrop-blur transition hover:border-neutral-300 hover:shadow-lg hover:shadow-black/5 dark:border-neutral-700 dark:bg-[#181818]/50 dark:hover:border-neutral-700"
        >
          {p.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.cover}
              alt=""
              width={p.coverSize?.[0]}
              height={p.coverSize?.[1]}
              loading={i < 5 ? "eager" : "lazy"}
              decoding="async"
              className="aspect-[16/9] w-full bg-neutral-200/60 object-cover dark:bg-neutral-800/60"
            />
          )}

          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
              <span>{formatDate(p.date) || p.tag}</span>
              <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wider dark:bg-neutral-900">
                {WORK_SOURCES[p.source]}
              </span>
            </div>

            <h2 className="mt-1.5 font-semibold leading-snug tracking-tight transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {p.title}
            </h2>
            {p.excerpt && (
              <p className="mt-2 line-clamp-4 text-sm text-neutral-600 dark:text-neutral-400">
                {p.excerpt}
              </p>
            )}
            {p.date && p.tag && (
              <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400">{p.tag}</div>
            )}

            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Читать
              <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
