import { Camera } from "lucide-react";
import { PhotoGallery } from "@/components/photo-gallery";
import { SavesTabs } from "@/components/saves-tabs";
import { getPhotos, PHOTO_CATEGORIES } from "@/lib/photos";

export const metadata = {
  title: "Фоткаю — Сохранёнки — Алексей Масюта",
};

export default function PhotosPage() {
  const photos = getPhotos();
  // Показываем только те категории, в которых реально есть снимки.
  const categories = PHOTO_CATEGORIES.filter((c) =>
    photos.some((p) => p.category === c.id),
  );

  return (
    <main className="w-full flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Сохранёнки</h1>
          <SavesTabs active="photos" />
        </div>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Фотографирую на свой айфончик иногда, где-нибудь в дороге от скуки
          обрабатываю фоточки в Snapseed и в родном редакторе айфона.
        </p>

        {photos.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 px-6 py-20 text-center dark:border-neutral-700">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/15 to-transparent text-amber-500 dark:text-amber-400">
              <Camera className="h-7 w-7" />
            </div>
            <h2 className="mt-6 text-xl font-semibold tracking-tight">
              Страница в разработке
            </h2>
            <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
              Коплю фоточки — скоро здесь появится галерея с самыми красивыми
              моментами. Загляните чуть позже.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <PhotoGallery photos={photos} categories={categories} />
          </div>
        )}
    </main>
  );
}
