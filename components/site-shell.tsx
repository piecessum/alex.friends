"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NotebookPen,
  Disc3,
  Camera,
  Briefcase,
  Home,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AvatarToggle } from "@/components/avatar-toggle";
import { links } from "@/lib/site";

type Tab = {
  label: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
};

// Основные разделы — вертикальный рельс слева вверху.
const tabs: Tab[] = [
  { label: "Пишу", icon: NotebookPen, href: "/notes" },
  { label: "Пластинки", icon: Disc3, href: "/vinyl" },
  { label: "Фоткаю", icon: Camera, href: "/photos" },
  { label: "Ищу работу", icon: Briefcase, href: links.resume, external: true },
];

// «Домой» живёт отдельно — в углу внизу рельса.
const homeTab: Tab = { label: "Домой", icon: Home, href: "/" };

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Иконка навигации. tip=true рисует всплывающий тултип с подписью
 * (используется в десктопном рельсе). На мобильной панели тултип не нужен.
 */
function NavIcon({
  tab,
  active,
  tip = false,
}: {
  tab: Tab;
  active: boolean;
  tip?: boolean;
}) {
  const Icon = tab.icon;
  const cls = `group relative inline-flex h-11 w-11 items-center justify-center rounded-xl transition ${
    active
      ? "bg-accent/15 text-accent"
      : "text-neutral-500 hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-100"
  }`;

  const content = (
    <>
      <Icon className="h-5 w-5" />
      {tip && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition group-hover:translate-x-0 group-hover:opacity-100 dark:bg-neutral-100 dark:text-neutral-900">
          {tab.label}
        </span>
      )}
    </>
  );

  return tab.external ? (
    <a
      href={tab.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={tab.label}
      title={tab.label}
      className={cls}
    >
      {content}
    </a>
  ) : (
    <Link href={tab.href} aria-label={tab.label} title={tab.label} className={cls}>
      {content}
    </Link>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Десктоп: вертикальный рельс на серой подложке слева */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center justify-between py-4 sm:flex">
        <nav className="flex flex-col items-center gap-2">
          {tabs.map((t) => (
            <NavIcon key={t.href} tab={t} active={isActive(t.href, pathname)} tip />
          ))}
        </nav>
        <div className="flex flex-col items-center gap-3">
          <ThemeToggle />
          <NavIcon tab={homeTab} active={isActive(homeTab.href, pathname)} tip />
        </div>
      </aside>

      {/* Контент — в белой карточке со скруглениями и отступами.
          Карточка занимает высоту экрана минус отступы (снизу на мобилке —
          место под нижние табы), а контент скроллится внутри неё. */}
      <div className="sm:pl-16">
        <div className="px-2 pt-16 pb-20 sm:p-3 sm:pb-3">
          <div className="h-[calc(100dvh-9rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm sm:h-[calc(100dvh-1.5rem)] dark:border-neutral-800/70 dark:bg-neutral-950">
            {children}
          </div>
        </div>
      </div>

      {/* Мобилка: сверху — аватар (на главную) слева и смена темы справа,
          на серой подложке над карточкой. */}
      <Link
        href="/"
        aria-label="Домой"
        className="fixed left-3 top-3 z-40 sm:hidden"
      >
        <AvatarToggle size={40} />
      </Link>
      <div className="fixed right-3 top-3 z-40 sm:hidden">
        <ThemeToggle />
      </div>

      {/* Мобилка: снизу — основные разделы, без разделительной полосы */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-6 py-3 sm:hidden">
        {tabs
          .filter((t) => !t.external)
          .map((t) => (
            <NavIcon key={t.href} tab={t} active={isActive(t.href, pathname)} />
          ))}
      </nav>
    </div>
  );
}
