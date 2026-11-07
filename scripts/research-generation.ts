import type { Research } from "../lib/research";

export function moscowDay(now = new Date()) {
  return new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

export function planGeneration(all: Research[], digestDays: string[], now = new Date()) {
  const day = moscowDay(now);
  const weekday = new Date(`${day}T12:00:00+03:00`).getUTCDay();
  if (weekday === 0) return { day, kind: "skip" as const, articles: [] };
  if (weekday === 6) {
    const monday = new Date(`${day}T00:00:00+03:00`).getTime() - 5 * 86400_000;
    const saturday = monday + 5 * 86400_000;
    const articles = all.filter(r => Date.parse(r.date) >= monday && Date.parse(r.date) < saturday)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { day, kind: digestDays.includes(day) || !articles.length ? "skip" as const : "digest" as const, articles };
  }
  return { day, kind: all.some(r => moscowDay(new Date(r.date)) === day) ? "skip" as const : "article" as const, articles: [] };
}

// The local author returns this schema; validate it again before publication.
type Schema = { type?: string; enum?: string[]; properties?: Record<string, Schema>; items?: Schema; anyOf?: Schema[]; required?: string[]; additionalProperties?: boolean; minItems?: number; maxItems?: number };
const str: Schema = { type: "string" };
const num: Schema = { type: "number" };
const object = (properties: Record<string, Schema>): Schema => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const array = (items: Schema, minItems = 1, maxItems = 40): Schema => ({ type: "array", items, minItems, maxItems });
const block = (type: string, fields: Record<string, Schema>) => object({ type: { type: "string", enum: [type] }, ...fields });
export const articleSchema = object({
  slug: str, title: str, dek: str,
  topic: { type: "string", enum: ["interfaces", "ai", "brain", "market", "gadgets", "cars"] },
  source: object({ title: str, publisher: str, url: str, year: num }),
  readingMinutes: num, coverPrompt: str,
  coverImage: { anyOf: [{ type: "null" }, object({ url: str, page: str, author: str, license: str, source: str, mode: { type: "string", enum: ["full", "cutout"] } })] },
  blocks: array({ anyOf: [
    block("text", { md: str }), block("heading", { text: str }),
    block("fact", { text: str }), block("quote", { text: str, author: str }),
    block("stats", { items: array(object({ value: str, label: str, source: str }), 2, 4) }),
    block("bars", { title: str, subtitle: str, source: str, items: array(object({ label: str, value: num }), 2, 13) }),
    block("line", { title: str, subtitle: str, source: str, points: array(object({ date: str, label: str, value: num }), 2) }),
    block("image", { url: str, caption: str, source: str }),
  ] }, 8, 35),
});
export const digestSchema = object({ intro: str, items: array(object({ slug: str, takeaway: str }), 1, 20) });

export function validateSchema(value: unknown, schema: Schema, at = "result"): void {
  if (schema.anyOf) {
    if (schema.anyOf.some(s => { try { validateSchema(value, s, at); return true; } catch { return false; } })) return;
    throw new Error(`${at}: unsupported value`);
  }
  if (schema.type === "null") { if (value !== null) throw new Error(`${at}: expected null`); return; }
  if (schema.type === "array") {
    if (!Array.isArray(value) || value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) throw new Error(`${at}: invalid array`);
    value.forEach((v, i) => validateSchema(v, schema.items!, `${at}[${i}]`)); return;
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${at}: expected object`);
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) if (!(key in obj)) throw new Error(`${at}.${key}: missing`);
    for (const [key, v] of Object.entries(obj)) {
      if (!schema.properties?.[key]) throw new Error(`${at}.${key}: unexpected field`);
      validateSchema(v, schema.properties[key], `${at}.${key}`);
    }
    return;
  }
  if (typeof value !== schema.type || (typeof value === "string" && !value.trim()) || (typeof value === "number" && !Number.isFinite(value))) throw new Error(`${at}: invalid ${schema.type}`);
  if (schema.enum && !schema.enum.includes(value as string)) throw new Error(`${at}: unknown value`);
}

export function sourceKey(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Source must be an HTTP URL");
  const decoded = decodeURIComponent(url.pathname + url.search);
  const doi = decoded.match(/10\.\d{4,9}\/[^\s&#?]+/i)?.[0];
  if (doi) return `doi:${doi.replace(/\/$/, "").toLowerCase()}`;
  if (/(^|\.)(arxiv\.org|ar5iv\.labs\.arxiv\.org)$/.test(url.hostname)) {
    const id = url.pathname.match(/\/(?:abs|pdf|html)\/(.+?)(?:\.pdf)?$/)?.[1];
    if (id) return `arxiv:${id.replace(/v\d+$/, "").toLowerCase()}`;
  }
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|ref$|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}${url.search}`.toLowerCase();
}

export function webSources(events: string): string[] {
  return events.split("\n").filter(Boolean).flatMap(line => {
    const event = JSON.parse(line);
    if (!["web_search", "web_search_call"].includes(event.item?.type)) return [];
    const item = event.item;
    return [item.action?.url, item.url, /^https?:\/\//.test(item.query ?? "") ? item.query : undefined,
      ...(item.results ?? []).map((r: { url?: string }) => r.url),
      ...(item.action?.sources ?? []).map((r: { url?: string }) => r.url),
    ].filter((url): url is string => typeof url === "string" && /^https?:\/\//.test(url));
  });
}

export function prepareArticle(value: unknown, day: string, all: Research[], searchedUrls: string[]): Research {
  validateSchema(value, articleSchema);
  const draft = value as Omit<Research, "date" | "coverImage"> & { coverImage: Research["coverImage"] | null };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) || draft.slug.length > 90) throw new Error("Invalid slug");
  if (all.some(r => r.slug === draft.slug || sourceKey(r.source.url) === sourceKey(draft.source.url))) throw new Error("Article or source already exists");
  sourceKey(draft.source.url);
  if (!searchedUrls.some(url => sourceKey(url) === sourceKey(draft.source.url))) throw new Error("Source was not returned by web search");
  const recentTopics = [...all].filter(r => r.date <= `${day}T08:00:00+03:00`).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2).map(r => r.topic);
  if (recentTopics.includes(draft.topic)) throw new Error("Topic repeats one of the last two articles");
  const words = draft.blocks.filter(b => b.type === "text").map(b => b.md).join(" ").split(/\s+/).length;
  if (words < 400 || words > 850) throw new Error(`Expected 400–800 words, got ${words}`);
  const quotes = draft.blocks.filter(b => b.type === "quote").length;
  if (quotes < 2 || quotes > 4) throw new Error("Expected 2–4 attributed quotes");
  if (!draft.blocks.some(b => ["image", "bars", "line"].includes(b.type))) throw new Error("Missing figure or chart");
  if (!Number.isInteger(draft.readingMinutes) || draft.readingMinutes < 3 || draft.readingMinutes > 6) throw new Error("Invalid reading time");
  if (!Number.isInteger(draft.source.year) || draft.source.year! < 1800 || draft.source.year! > Number(day.slice(0, 4))) throw new Error("Invalid source year");
  for (const b of draft.blocks) if (b.type === "line" && b.points.some(p => !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.date))) throw new Error("Invalid chart date");
  for (const b of draft.blocks) if (b.type === "image" && b.url) sourceKey(b.url);
  if (draft.coverImage) {
    sourceKey(draft.coverImage.url); sourceKey(draft.coverImage.page);
    if (!/^(public domain|cc0|cc by(?: 4\.0| 3\.0| 2\.0)?|pexels license|unsplash license|pixabay license)$/i.test(draft.coverImage.license)) throw new Error("Unsupported cover license");
  }
  const { coverImage, ...rest } = draft;
  return { ...rest, date: `${day}T08:00:00+03:00`, ...(coverImage ? { coverImage } : {}) };
}
