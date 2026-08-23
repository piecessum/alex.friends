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
    <main className="w-full flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Коллекция пластинок
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Винил, который у меня есть, и то, что хочу заполучить.
        </p>

        <div className="mt-8">
          <VinylGallery have={have} want={want} />
        </div>
    </main>
  );
}
