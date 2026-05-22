import Link from "next/link";
import { ArrowLeft, Disc3 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Пластинки — Алексей Масюта",
};

export default function VinylPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
          <Disc3 className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Коллекция пластинок
        </h1>
        <p className="mt-4 max-w-lg text-neutral-600 dark:text-neutral-400">
          Здесь будут карточки моих пластинок с обложками — как коробки от
          винила, которые можно будет покрутить. Раздел в разработке.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1.5 text-sm text-neutral-600 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
