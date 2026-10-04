// Синхронизация сохранённых пинов Pinterest: npm run sync:pins
// Пишет content/pins.json (см. lib/pinterest.ts). Если ничего не изменилось —
// файл не трогает, чтобы не плодить коммиты и деплои.

import fs from "node:fs";
import path from "node:path";
import { fetchAllPins } from "@/lib/pinterest";

const FILE = path.join(process.cwd(), "content", "pins.json");

async function main() {
  const pins = await fetchAllPins();
  if (pins.length === 0) throw new Error("Pinterest не вернул ни одного пина — файл не трогаю");
  console.log(`Пинов: ${pins.length}`);

  const next = JSON.stringify(pins) + "\n";
  const prev = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8") : "";
  if (next === prev) {
    console.log("Пины не изменились — файл не трогаю.");
    return;
  }
  fs.writeFileSync(FILE, next);
  console.log(`Готово: ${FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
