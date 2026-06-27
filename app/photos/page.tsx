import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PhotoGallery } from "@/components/photo-gallery";

export const metadata = {
  title: "Фотографирую — Алексей Масюта",
};

// Читаем список снимков из public/photos на этапе сборки: чтобы добавить
// новые фото, достаточно закинуть файлы в папку — код менять не нужно.
function getPhotos(): string[] {
  const dir = path.join(process.cwd(), "public", "photos");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
    .sort()
    .map((f) => `/photos/${f}`);
}

export default function PhotosPage() {
  const photos = getPhotos();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 py-12 sm:py-16">
        {/* Шапка остаётся в читаемой колонке */}
        <div className="mx-auto w-full max-w-5xl px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-amber-600 dark:text-neutral-400 dark:hover:text-amber-400"
          >
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>

          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Фотографирую
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Фиксирую красивые моменты.
            </p>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="mx-auto mt-12 flex w-full max-w-5xl flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 px-6 py-20 text-center dark:border-neutral-700">
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
          // Галерея во всю ширину экрана
          <div className="mt-10 px-1 sm:px-2 lg:px-4">
            <PhotoGallery photos={photos} />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
