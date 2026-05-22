"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { links } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/60 bg-background/70 backdrop-blur dark:border-neutral-800/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-[11px] font-bold text-white">
            АМ
          </span>
          <span>личное</span>
        </Link>

        <div className="flex items-center gap-3">
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
