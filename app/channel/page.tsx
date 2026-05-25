import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChannelFeed } from "@/components/channel-feed";
import { fetchChannel } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Пишу всякую хрень — Алексей Масюта",
};

export default async function ChannelPage() {
  const initial = await fetchChannel();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Пишу всякую хрень
        </h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          интересное, неинтересное, мемное, душное
        </p>

        <div className="mt-10">
          {initial.posts.length ? (
            <ChannelFeed initial={initial} />
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Не получилось загрузить ленту. Загляни{" "}
              <a
                href="https://t.me/ux_review"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline dark:text-indigo-400"
              >
                в канал
              </a>
              .
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
