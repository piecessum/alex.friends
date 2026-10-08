import { PinsGrid } from "@/components/pins-grid";
import { SavesTabs } from "@/components/saves-tabs";
import { getPins, PINTEREST_USER } from "@/lib/pinterest";

export const metadata = {
  title: "Пины — Сохранёнки — Алексей Масюта",
};

export default function PinsPage() {
  const pins = getPins();

  return (
    <main className="w-full flex-1">
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Сохранёнки</h1>
          <SavesTabs active="pins" />
        </div>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Мой лоскутный ковёр вдохновения. В{" "}
          <a
            href={`https://www.pinterest.com/${PINTEREST_USER}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            профиле Pinterest
          </a>{" "}
          всё по полочкам, а тут просто полистать.
        </p>
      </div>

      {/* Сетка — во всю ширину, встык к краям панели. */}
      <PinsGrid pins={pins} />
    </main>
  );
}
