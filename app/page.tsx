"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  NotebookPen,
  Disc3,
  Camera,
  Briefcase,
} from "lucide-react";
import { AvatarToggle } from "@/components/avatar-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { links } from "@/lib/site";

type Widget = {
  title: string;
  description: string;
  icon: typeof NotebookPen;
  href: string;
  external?: boolean;
  soon?: boolean;
  /** Tailwind-классы размера в bento-сетке */
  span?: string;
  accent?: string;
};

const widgets: Widget[] = [
  {
    title: "Пишу",
    description: "Нафига? ды хочется",
    icon: NotebookPen,
    href: "/notes",
    span: "sm:col-span-2",
    accent: "from-indigo-500/15 text-indigo-500 dark:text-indigo-400",
  },
  {
    title: "Пластинки",
    description: "Моя коллекция винила — что есть и что хочу.",
    icon: Disc3,
    href: "/vinyl",
    span: "lg:row-span-2",
    accent: "from-purple-500/15 text-purple-500 dark:text-purple-400",
  },
  {
    title: "Фотографирую",
    description: "Фиксирую красивые моменты.",
    icon: Camera,
    href: "/photos",
    accent: "from-amber-500/15 text-amber-500 dark:text-amber-400",
  },
  {
    title: "Я ищу работу",
    description: "Сайт-резюме для работодателя.",
    icon: Briefcase,
    href: links.resume,
    external: true,
    accent: "from-emerald-500/15 text-emerald-500 dark:text-emerald-400",
  },
];

export default function Dashboard() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(99,102,241,0.16),transparent_70%)]"
      />

      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        {/* Шапка дашборда: аватар + приветствие + переключатель темы */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <AvatarToggle size={104} />
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Привет, я Алексей
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Это что блог? — нет это бложик
              </p>
            </div>
          </div>
          <ThemeToggle />
        </motion.div>

        {/* Bento-сетка виджетов */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w, i) => {
            const Icon = w.icon;
            const inner = (
              <>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br to-transparent ${w.accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {w.soon ? (
                    <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                      скоро
                    </span>
                  ) : w.external ? (
                    <ArrowUpRight className="h-4 w-4 text-neutral-400 transition group-hover:text-indigo-500" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                  )}
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {w.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {w.description}
                </p>
              </>
            );

            const cardClass =
              "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/50 p-6 backdrop-blur transition hover:border-neutral-300 hover:shadow-lg hover:shadow-black/5 dark:border-neutral-800 dark:bg-neutral-950/50 dark:hover:border-neutral-700";

            // На растянутом по высоте виджете пластинок добавляем
            // декоративную пластинку в углу, чтобы не было пустоты.
            const decoration =
              w.title === "Пластинки" ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-20 -bottom-20 hidden h-72 w-72 rounded-full opacity-70 transition-transform duration-500 ease-out group-hover:rotate-12 lg:block"
                  style={{
                    backgroundImage:
                      "repeating-radial-gradient(circle at 50% 50%, rgba(168,85,247,0.18) 0px, rgba(168,85,247,0.18) 1px, transparent 2px, transparent 4px), radial-gradient(circle at 50% 50%, rgba(168,85,247,0.28), rgba(168,85,247,0.05) 60%, transparent 75%)",
                  }}
                />
              ) : null;

            const innerContent = (
              <>
                {decoration}
                <div className="relative">{inner}</div>
              </>
            );

            return (
              <motion.div
                key={w.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.07 }}
                className={w.span}
              >
                {w.external ? (
                  <a
                    href={w.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardClass}
                  >
                    {innerContent}
                  </a>
                ) : (
                  <Link href={w.href} className={cardClass}>
                    {innerContent}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
