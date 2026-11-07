import { test } from "node:test";
import assert from "node:assert/strict";
import { subscriptionEnv } from "./research-local";
import { articleSchema, moscowDay, planGeneration, prepareArticle, sourceKey, validateSchema, webSources } from "./research-generation";
import type { Research } from "../lib/research";

test("subscription child never inherits API credentials or endpoints", () => {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "test", OPENAI_API_KEY: "paid-key", OPENAI_BASE_URL: "https://paid.example", OPENAI_API_BASE: "x", CODEX_API_KEY: "key", PATH: "/usr/bin", GH_TOKEN: "repo-token", GITHUB_TOKEN: "repo-token", RESEARCH_CODEX_AUTH: "bootstrap-token" };
  assert.deepEqual(subscriptionEnv(env), { NODE_ENV: "test", PATH: "/usr/bin" });
  assert.equal(env.OPENAI_API_KEY, "paid-key");
});
test("one issue per Moscow day, Sunday off", () => {
  assert.equal(moscowDay(new Date("2026-11-05T21:30:00Z")), "2026-11-06");
  assert.equal(planGeneration([], [], new Date("2026-11-05T04:00:00Z")).kind, "article");
  assert.equal(planGeneration([{ date: "2026-11-05T08:00:00+03:00" } as Research], [], new Date("2026-11-05T04:00:00Z")).kind, "skip");
  assert.equal(planGeneration([], [], new Date("2026-11-08T04:00:00Z")).kind, "skip");
});
test("Saturday includes exactly the Moscow work week and skips existing digest", () => {
  const all = ["2026-11-01T22:00:00Z", "2026-11-06T08:00:00+03:00", "2026-11-07T08:00:00+03:00"].map(date => ({ date } as Research));
  const now = new Date("2026-11-07T04:00:00Z");
  assert.equal(planGeneration(all, [], now).articles.length, 2);
  assert.equal(planGeneration(all, ["2026-11-07"], now).kind, "skip");
  assert.equal(planGeneration([], [], now).kind, "skip");
});
test("invalid model output cannot add publishing metadata or arbitrary blocks", () => {
  assert.throws(() => validateSchema({}, articleSchema));
  assert.throws(() => prepareArticle({ slug: "../bad", telegram: { messageId: 1 } }, "2026-11-05", [], []));
  assert.throws(() => sourceKey("file:///etc/passwd"));
  assert.notEqual(sourceKey("https://example.org/article?id=1"), sourceKey("https://example.org/article?id=2"));
  assert.equal(sourceKey("https://example.org/article?utm_source=x"), sourceKey("https://example.org/article"));
});
test("source evidence comes from web tool events, not generated final text", () => {
  const events = [
    { item: { type: "agent_message", results: [{ url: "https://invented.example" }] } },
    { item: { type: "web_search", results: [{ url: "https://arxiv.org/abs/2402.05314" }] } },
    { item: { type: "web_search" } },
  ].map(e => JSON.stringify(e)).join("\n");
  assert.deepEqual(webSources(events), ["https://arxiv.org/abs/2402.05314"]);
});
test("Linux compact search events preserve URLs of opened originals", () => {
  const events = [{item:{type:"web_search",action:{type:"open_page",url:"https://arxiv.org/pdf/2402.05314"}}}, {item:{type:"web_search",query:"https://example.org/paper"}}].map(e => JSON.stringify(e)).join("\n");
  assert.deepEqual(webSources(events), ["https://arxiv.org/pdf/2402.05314", "https://example.org/paper"]);
});
test("equivalent scholarly links identify the same original", () => {
  assert.equal(sourceKey("https://arxiv.org/abs/2402.05314"),sourceKey("https://arxiv.org/pdf/2402.05314v1.pdf"));
  assert.equal(sourceKey("https://doi.org/10.1371/journal.pone.0045457"),sourceKey("https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0045457"));
});
