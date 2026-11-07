import { Disc3 } from "lucide-react";

export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-page py-16 text-neutral-500 dark:text-neutral-400">
      <Disc3 aria-hidden="true" strokeWidth={1} className="h-14 w-14 animate-spin text-accent motion-reduce:animate-none" style={{ animationDuration: "1.8s" }} />
      <span className="text-ui">Загружаю…</span>
    </div>
  );
}
