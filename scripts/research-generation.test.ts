import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generate } from "./research-generate";
import { articleSchema, digestSchema, moscowDay, planGeneration, prepareArticle, sourceKey, validateSchema } from "./research-generation";
import type { Research } from "../lib/research";

const dated = (date: string) => ({ date, topic: "cars", slug: date } as Research);
test("publication day uses Moscow, including UTC day boundary", () => {
  assert.equal(moscowDay(new Date("2026-11-05T21:30:00Z")), "2026-11-06");
  assert.equal(planGeneration([dated("2026-11-06T08:00:00+03:00")], [], new Date("2026-11-05T22:00:00Z")).kind, "skip");
});
test("weekdays generate once; Sunday never generates", () => {
  assert.equal(planGeneration([], [], new Date("2026-11-05T04:00:00Z")).kind, "article");
  assert.equal(planGeneration([dated("2026-11-05T08:00:00+03:00")], [], new Date("2026-11-05T04:00:00Z")).kind, "skip");
  assert.equal(planGeneration([], [], new Date("2026-11-08T04:00:00Z")).kind, "skip");
});
test("Saturday selects Moscow Monday–Friday and does not repeat a digest", () => {
  const articles = [dated("2026-11-07T01:00:00+03:00"), dated("2026-11-06T08:00:00+03:00"), dated("2026-11-01T22:00:00Z"), dated("2026-11-01T12:00:00Z")];
  const now = new Date("2026-11-07T04:00:00Z");
  const plan = planGeneration(articles, [], now);
  assert.equal(plan.kind, "digest");
  assert.deepEqual(plan.articles.map(r => r.date), ["2026-11-01T22:00:00Z", "2026-11-06T08:00:00+03:00"]);
  assert.equal(planGeneration(articles, ["2026-11-07"], now).kind, "skip");
  assert.equal(planGeneration([], [], now).kind, "skip");
});

function draft() {
  const old = JSON.parse(fs.readFileSync(new URL("../content/research/choice-blindness-morals.json", import.meta.url), "utf8"));
  return {
    slug: old.slug, title: old.title, dek: old.dek, topic: old.topic,
    source: old.source, readingMinutes: old.readingMinutes, coverPrompt: old.coverPrompt,
    coverImage: null,
    blocks: [
      { type: "text", md: Array(420).fill("слово").join(" ") },
      { type: "heading", text: "Методика" },
      { type: "text", md: "Методика исследования" },
      { type: "bars", title: "Результаты", subtitle: "Доля, %", source: "Hall, 2012", items: [{ label: "A", value: 69 }, { label: "B", value: 53 }] },
      { type: "quote", text: "Первая цитата", author: "Hall" },
      { type: "quote", text: "Вторая цитата", author: "Hall" },
      { type: "fact", text: "Факт из источника" },
      { type: "text", md: "Ограничения исследования" },
    ],
  };
}
test("a valid draft gets the controlled date, without publishing metadata", () => {
  const d = draft();
  const article = prepareArticle(d, "2026-11-05", [], [d.source.url]);
  assert.equal(article.date, "2026-11-05T08:00:00+03:00");
  assert.equal("coverImage" in article, false);
  assert.equal("telegram" in article, false);
});
test("rejects invalid model JSON, unsupported blocks and non-finite chart data", () => {
  assert.throws(() => validateSchema({}, articleSchema));
  const d = draft();
  assert.throws(() => validateSchema({ ...d, telegram: { messageId: 1 } }, articleSchema));
  assert.throws(() => validateSchema({ ...d, blocks: [{ type: "html", text: "<script>" }] }, articleSchema));
  const bar = d.blocks[3] as { items: { value: number }[] };
  bar.items[0].value = Infinity;
  assert.throws(() => validateSchema(d, articleSchema));
  assert.throws(() => validateSchema({ intro: "", items: [] }, digestSchema));
});
test("rejects path traversal, duplicate sources, repeated topics and unsearched sources", () => {
  const d = draft();
  const prepare = (v: unknown, all: Research[] = [], urls = [d.source.url]) => prepareArticle(v, "2026-11-05", all, urls);
  assert.throws(() => prepare({ ...d, slug: "../injected" }), /slug/);
  assert.throws(() => prepare(d, [{ ...d, date: "2026-11-04", source: { ...d.source, url: `${d.source.url}/?ref=test` } } as unknown as Research]), /already exists/);
  assert.throws(() => prepare(d, [{ ...d, slug: "other", date: "2026-11-04", source: { ...d.source, url: "https://example.org/other" } } as unknown as Research]), /Topic repeats/);
  assert.throws(() => prepare(d, [], ["https://example.org/other"]), /not returned/);
});
test("source identity preserves article query parameters and removes tracking", () => {
  assert.notEqual(sourceKey("https://example.org/article?id=1"), sourceKey("https://example.org/article?id=2"));
  assert.equal(sourceKey("https://www.example.org/article/?id=1&utm_source=feed"), sourceKey("http://example.org/article?id=1"));
  assert.throws(() => sourceKey("file:///etc/passwd"));
});
test("rejects short text, absent quotes, incorrect reading time and prohibited cover licenses", () => {
  const d = draft();
  const prepare = (v: unknown) => prepareArticle(v, "2026-11-05", [], [d.source.url]);
  const short = structuredClone(d); short.blocks[0] = { type: "text", md: "Мало текста" };
  assert.throws(() => prepare(short), /words/);
  assert.throws(() => prepare({ ...d, blocks: d.blocks.map(b => b.type === "quote" ? { type: "fact", text: "Факт" } : b) }), /quotes/);
  assert.throws(() => prepare({ ...d, readingMinutes: 99 }), /reading time/);
  assert.throws(() => prepare({ ...d, coverImage: { url: "https://example.org/photo.jpg", page: "https://example.org/photo", author: "A", license: "CC BY-SA", source: "Example", mode: "full" } }), /license/);
});

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "research-test-"));
  const dir = path.join(root, "content/research");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "AGENT.md"), "Редакционные правила\n## 5. Опубликуй\nНе передавать этот раздел модели");
  return { root, dir };
}

test("complete mocked API flow writes one article; rerun makes no API calls", async t => {
  const { root, dir } = workspace();
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  const d = draft();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    assert.equal(body.store, false);
    assert.ok(!body.instructions.includes("Не передавать этот раздел модели"));
    const output = calls++ === 0
      ? [{ type: "web_search_call", action: { sources: [{ url: d.source.url }] } }, { type: "message", content: [{ type: "output_text", text: "Проверенные заметки" }] }]
      : [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(d) }] }];
    return Response.json({ id: "test", status: "completed", output });
  });
  try {
    await generate(root, new Date("2026-11-05T04:00:00Z"), []);
    const file = path.join(dir, `${d.slug}.json`);
    const first = fs.readFileSync(file, "utf8");
    assert.equal(JSON.parse(first).date, "2026-11-05T08:00:00+03:00");
    await generate(root, new Date("2026-11-05T06:00:00Z"), []);
    assert.equal(calls, 2);
    assert.equal(fs.readFileSync(file, "utf8"), first);
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("missing key and incomplete API responses leave content untouched", async t => {
  const { root, dir } = workspace();
  const key = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(generate(root, new Date("2026-11-05T04:00:00Z"), []), /Missing OPENAI_API_KEY/);
    process.env.OPENAI_API_KEY = "test-key";
    t.mock.method(globalThis, "fetch", async () => Response.json({ id: "test", status: "incomplete", output: [] }));
    await assert.rejects(generate(root, new Date("2026-11-05T04:00:00Z"), []), /incomplete/);
    assert.deepEqual(fs.readdirSync(dir), ["AGENT.md"]);
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Saturday writes a digest from this week's articles, and skips a rerun", async t => {
  const { root, dir } = workspace();
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  const article = { ...draft(), date: "2026-11-05T08:00:00+03:00" };
  fs.writeFileSync(path.join(dir, `${article.slug}.json`), JSON.stringify(article));
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ id: "test", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ intro: "Конкретные результаты недели.", items: [{ slug: article.slug, takeaway: "Деталь из полного текста." }] }) }] }] });
  });
  try {
    const now = new Date("2026-11-07T06:00:00Z");
    await generate(root, now, []);
    const digest = JSON.parse(fs.readFileSync(path.join(dir, "digests/2026-11-07.json"), "utf8"));
    assert.equal(digest.slug, "2026-11-07");
    assert.deepEqual(digest.items.map((i: { slug: string }) => i.slug), [article.slug]);
    await generate(root, now, []);
    assert.equal(calls, 1);
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
