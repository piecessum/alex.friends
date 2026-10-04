import { ArrowUpRight } from "lucide-react";
import { PinsGrid } from "@/components/pins-grid";
import { getPins, PINTEREST_USER } from "@/lib/pinterest";

export const metadata = {
  title: "Вдохновляюсь — Алексей Масюта",
};

export default function PinsPage() {
  const pins = getPins();

  return (
    <main className="w-full flex-1">
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Вдохновляюсь</h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Всё, что сохранил в Pinterest: {pins.length} картинок.{" "}
          <a
            href={`https://www.pinterest.com/${PINTEREST_USER}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Профиль
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </p>
      </div>

      {/* Сетка — во всю ширину, встык к краям панели. */}
      <PinsGrid pins={pins} />
    </main>
  );
}
