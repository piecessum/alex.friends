// Транслитерация заголовка в slug лонгрида — по образцу уже существующих
// content/notes/*.json (напр. "Дизайн коробки" → "Dizajn-korobki-06-08"):
// посимвольная ru→en транслитерация с сохранением регистра, слова через
// дефис, суффикс -MM-DD (день публикации).

const LOWER: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
  и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
  щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const MAP: Record<string, string> = {
  ...LOWER,
  ...Object.fromEntries(
    Object.entries(LOWER).map(([k, v]) => [k.toUpperCase(), v.toUpperCase()])
  ),
};

function transliterate(s: string): string {
  return [...s].map((ch) => MAP[ch] ?? ch).join("");
}

export function slugifyTitle(title: string, date: Date = new Date()): string {
  const words = transliterate(title)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const base = words.join("-") || "post";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${base}-${mm}-${dd}`;
}
