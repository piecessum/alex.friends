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

// Категории-чипсы соответствуют подпапкам в public/photos. Чтобы добавить
// новое фото, достаточно положить файл в нужную папку — код менять не нужно.
// Новую категорию заводим, добавив папку сюда.
const CATEGORIES = [
  { id: "priroda", label: "Природа" },
  { id: "arhitektura", label: "Архитектура" },
  { id: "street-art", label: "Стрит-арт" },
] as const;

const IMG_RE = /\.(jpe?g|png|webp|avif|gif)$/i;

export type Photo = { src: string; category: string };

function getPhotos(): Photo[] {
  const root = path.join(process.cwd(), "public", "photos");
  const photos: Photo[] = [];
  for (const { id } of CATEGORIES) {
    let files: string[] = [];
    try {
      files = fs.readdirSync(path.join(root, id));
    } catch {
      continue;
    }
    for (const f of files.filter((f) => IMG_RE.test(f)).sort()) {
      photos.push({ src: `/photos/${id}/${f}`, category: id });
    }
  }
  return photos;
}

export default function PhotosPage() {
  const photos = getPhotos();
  // Показываем только те категории, в которых реально есть снимки.
  const categories = CATEGORIES.filter((c) =>
    photos.some((p) => p.category === c.id)
  );

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
            <PhotoGallery photos={photos} categories={categories} />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
