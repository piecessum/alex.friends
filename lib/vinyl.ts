import fs from "node:fs";
import path from "node:path";
import { slugifyVinyl } from "@/lib/vinyl-utils";

export type VinylAlbum = { title: string; tracks: string[] };
export type VinylData = { have: VinylAlbum[]; want: string[] };
export type VinylItem = {
  title: string;
  tracks: string[];
  /** Описание издания абзацами — для пластинок, где «треки» это на самом деле
   *  не список песен, а сведения о записи (в ролях, оркестр и т.п.). */
  description?: string[];
  want: boolean;
  slug: string;
  front?: string;
  back?: string;
  genre?: string;
};

/** Обогащение по slug: фото (front/back), уточнённые треки и флаг own.
 *  vinyl.json держит сами списки (есть/хочу), подробности по альбому — здесь. */
type VinylExtra = Record<
  string,
  {
    front?: string;
    back?: string;
    tracks?: string[];
    description?: string[];
    own?: boolean;
    genre?: string;
  }
>;

export function getVinyl(): VinylData {
  const file = path.join(process.cwd(), "content", "vinyl.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function getExtra(): VinylExtra {
  const file = path.join(process.cwd(), "content", "vinyl-extra.json");
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

/** Плоский список всех пластинок (есть + хочу) со slug'ами и фото. */
export function getAllVinylItems(): VinylItem[] {
  const { have, want } = getVinyl();
  const extra = getExtra();

  const build = (title: string, tracks: string[], want: boolean): VinylItem => {
    const slug = slugifyVinyl(title);
    const ex = extra[slug] || {};
    return {
      title,
      tracks: ex.tracks?.length ? ex.tracks : tracks,
      description: ex.description,
      // own: true в обогащении переносит пластинку из «хочу» в «есть»
      // (быстрый способ отметить покупку, не трогая списки в vinyl.json)
      want: want && ex.own !== true,
      slug,
      front: ex.front,
      back: ex.back,
      genre: ex.genre,
    };
  };

  return [
    ...have.map((a) => build(a.title, a.tracks, false)),
    ...want.map((w) => build(w, [], true)),
  ];
}

export function getVinylItem(slug: string): VinylItem | undefined {
  return getAllVinylItems().find((i) => i.slug === slug);
}
