import { ArrowUpRight } from "lucide-react";
import { links } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            © {new Date().getFullYear()} Алексей Масюта · личное пространство
          </p>
          <a
            href={links.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-neutral-600 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
          >
            Мой сайт-резюме (для работодателя)
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
