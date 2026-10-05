import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RU_MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** ISO-дата → «5 октября 2026» (по Москве — сайт русскоязычный). */
export function formatRuDate(iso: string): string {
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
