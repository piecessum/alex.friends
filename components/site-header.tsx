import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { links } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-4 z-50 mt-4 px-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full border border-neutral-200/70 bg-background/70 py-2 pr-2 pl-3 shadow-lg shadow-black/5 backdrop-blur-md dark:border-neutral-800/70">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          {/* Аватар по теме: день — в очках, ночь — без */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/avatar/day.PNG"
            alt=""
            className="h-7 w-7 rounded-full object-cover dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/avatar/night.PNG"
            alt=""
            className="hidden h-7 w-7 rounded-full object-cover dark:block"
          />
          <span>бложик</span>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={links.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/60 px-3 py-1.5 text-sm text-neutral-700 backdrop-blur transition hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-300 dark:hover:text-neutral-100"
          >
            Резюме
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
