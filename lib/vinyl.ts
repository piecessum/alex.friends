import fs from "node:fs";
import path from "node:path";

export type VinylAlbum = { title: string; tracks: string[] };
export type VinylData = { have: VinylAlbum[]; want: string[] };

export function getVinyl(): VinylData {
  const file = path.join(process.cwd(), "content", "vinyl.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
