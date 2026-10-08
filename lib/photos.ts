// Мои фотографии для вкладки «Фоткаю» в «Сохранёнках» (/photos).
// Категории соответствуют подпапкам в public/photos: чтобы добавить фото,
// достаточно положить файл в нужную папку. Новую категорию — завести тут.

import fs from "node:fs";
import path from "node:path";

export const PHOTO_CATEGORIES = [
  { id: "priroda", label: "Природа" },
  { id: "arhitektura", label: "Архитектура" },
  { id: "street-art", label: "Стрит-арт" },
] as const;

const IMG_RE = /\.(jpe?g|png|webp|avif|gif)$/i;

export type Photo = { src: string; category: string };

export function getPhotos(): Photo[] {
  const root = path.join(process.cwd(), "public", "photos");
  const photos: Photo[] = [];
  for (const { id } of PHOTO_CATEGORIES) {
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
