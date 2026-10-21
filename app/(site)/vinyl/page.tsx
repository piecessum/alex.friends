import { VinylGallery } from "@/components/vinyl-gallery";
import { getAllVinylItems } from "@/lib/vinyl";

export const metadata = {
  title: "Пластинки — Алексей Масюта",
};

export default function VinylPage() {
  const items = getAllVinylItems();
  const have = items.filter((i) => !i.want);
  const want = items.filter((i) => i.want);

  return (
    <main className="w-full flex-1 px-page py-12 sm:py-16">
        <h1 className="text-h1 font-bold tracking-tight hyphens-auto">
          Коллекция пластинок
        </h1>
        <p className="mt-3 max-w-[40em] text-body text-neutral-600 dark:text-neutral-400">
          Винил, который у меня есть, и то, что хочу заполучить.
        </p>

        <div className="mt-8">
          <VinylGallery have={have} want={want} />
        </div>
    </main>
  );
}
