import fs from "node:fs";
import path from "node:path";
import { slugifyVinyl } from "@/lib/vinyl-utils";

export type VinylAlbum = { title: string; tracks: string[] };
export type VinylData = { have: VinylAlbum[]; want: string[] };
export type VinylItem = {
  title: string;
  tracks: string[];
  want: boolean;
  slug: string;
};

export function getVinyl(): VinylData {
  const file = path.join(process.cwd(), "content", "vinyl.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Плоский список всех пластинок (есть + хочу) со slug'ами. */
export function getAllVinylItems(): VinylItem[] {
  const { have, want } = getVinyl();
  return [
    ...have.map((a) => ({
      title: a.title,
      tracks: a.tracks,
      want: false,
      slug: slugifyVinyl(a.title),
    })),
    ...want.map((w) => ({
      title: w,
      tracks: [] as string[],
      want: true,
      slug: slugifyVinyl(w),
    })),
  ];
}

export function getVinylItem(slug: string): VinylItem | undefined {
  return getAllVinylItems().find((i) => i.slug === slug);
}
