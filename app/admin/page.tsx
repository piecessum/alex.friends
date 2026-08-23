import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionCookie } from "@/lib/session";
import { getLocalChannelPosts } from "@/lib/channel-posts";
import { getNotesIndex, formatDate } from "@/lib/notes";

export const metadata = { title: "Админка" };

function stripHtml(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 80 ? text.slice(0, 80).trimEnd() + "…" : text;
}

export default async function AdminHome() {
  const store = await cookies();
  const session = verifySessionCookie(store.get(SESSION_COOKIE)?.value);

  const posts = getLocalChannelPosts().slice(0, 5);
  const notes = getNotesIndex().slice(0, 5);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">Админка</h1>
      <p className="mt-2 text-neutral-500">Вход выполнен, id {session?.uid}.</p>

      <Link
        href="/admin/editor"
        className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
      >
        Новый пост
      </Link>

      {posts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Последние посты (из /admin)
          </h2>
          <ul className="mt-3 space-y-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/channel/${p.id}`}
                  className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {stripHtml(p.html) || `Пост ${p.id}`}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Последние лонгриды
          </h2>
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li key={n.slug} className="flex items-baseline gap-2 text-sm">
                <Link
                  href={`/notes/${n.slug}`}
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {n.title}
                </Link>
                <span className="text-neutral-400">{formatDate(n.month, n.day, n.year)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form action="/api/auth/logout" method="POST" className="mt-10">
        <button
          type="submit"
          className="text-sm text-indigo-600 underline underline-offset-2 dark:text-indigo-400"
        >
          Выйти
        </button>
      </form>
    </main>
  );
}
