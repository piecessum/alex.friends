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
 * (используется в десктопном рельсе). compact=true — чуть мельче (мобилка).
 */
function NavIcon({
  tab,
  active,
  tip = false,
  compact = false,
}: {
  tab: Tab;
  active: boolean;
  tip?: boolean;
  compact?: boolean;
}) {
  const Icon = tab.icon;
  const cls = `group relative inline-flex items-center justify-center rounded-xl transition ${
    compact ? "h-10 w-10" : "h-11 w-11"
  } ${
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
  const mainTabs = tabs.filter((t) => !t.external);

  return (
    // Корень залочен на высоту вьюпорта и сам не скроллится — скролл живёт
    // только внутри контентной карточки (как в GitLab).
    <div className="flex h-[100dvh] flex-col overflow-hidden sm:flex-row">
      {/* Мобилка: верхняя панель — слева разделы, справа аватар (домой) и тема */}
      <nav className="flex shrink-0 items-center justify-between px-3 pb-1 pt-2 sm:hidden">
        <div className="flex items-center gap-1">
          {mainTabs.map((t) => (
            <NavIcon
              key={t.href}
              tab={t}
              active={isActive(t.href, pathname)}
              compact
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Домой" className="inline-flex">
            <AvatarToggle size={34} />
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Десктоп: вертикальный рельс слева на серой подложке */}
      <aside className="hidden w-16 shrink-0 flex-col items-center justify-between py-4 sm:flex">
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

      {/* Контент — единственная скролл-область. На мобилке карточка прижата
          к краям экрана (серая подложка только сверху, за панелью) и скруглена
          лишь сверху; на десктопе — со всех сторон в отступах. */}
      <div className="min-h-0 flex-1 sm:p-3 sm:pl-0">
        <div className="h-full overflow-y-auto overflow-x-hidden rounded-t-2xl border-t border-neutral-200/70 bg-white shadow-sm [scrollbar-gutter:stable_both-edges] sm:rounded-2xl sm:border dark:border-neutral-800/70 dark:bg-neutral-950">
          {children}
        </div>
      </div>
    </div>
  );
}
