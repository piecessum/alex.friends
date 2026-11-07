import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTelegramAccess, cronAuthorized, deliverOnce, hasReadyCover, TelegramRejected, type ReceiptStore, type DeliveryIssue } from "../lib/research-delivery";
import { getAllResearch, getAllDigests } from "../lib/research";
import { digestTitle } from "./research-generation";
import { clockAction } from "./research-clock.mjs";
import { issueDay } from "./research-issue-day.mjs";

function memoryStore(): ReceiptStore {
  let current: Awaited<ReturnType<ReceiptStore["get"]>> = null, counter = 0;
  return {
    async get() { return current ? structuredClone(current) : null; },
    async put(_issue, value, sha) {
      if (current ? sha !== current.sha : sha !== undefined) throw Object.assign(new Error("Conflict"), { status: 409 });
      const next = String(++counter); current = { value: structuredClone(value), sha: next }; return next;
    },
  };
}
const issue: DeliveryIssue = { day: "2026-11-07", kind: "digest", slug: "2026-11-07" };
test("two independent publishers produce one Telegram message", async () => {
  const store = memoryStore(); let calls = 0;
  const send = async () => { calls++; return 42; };
  const results = await Promise.allSettled([deliverOnce(issue, send, store), deliverOnce(issue, send, store)]);
  assert.equal(calls, 1); assert.ok(results.some(r => r.status === "fulfilled"));
  assert.equal(await deliverOnce(issue, send, store), 42); assert.equal(calls, 1);
});
test("a confirmed rejection can retry, an ambiguous network result cannot duplicate", async () => {
  const store = memoryStore();
  await assert.rejects(deliverOnce(issue, async () => { throw new TelegramRejected("Rejected"); }, store));
  assert.equal(await deliverOnce(issue, async () => 42, store), 42);
  const uncertain = memoryStore(); let calls = 0;
  await assert.rejects(deliverOnce(issue, async () => { calls++; throw new Error("Connection lost"); }, uncertain));
  await assert.rejects(deliverOnce(issue, async () => { calls++; return 99; }, uncertain));
  assert.equal(calls, 1);
});
test("clock publishes at 08:00 Moscow on weekdays and Saturday, Sunday is off", () => {
  assert.equal(clockAction(new Date("2026-11-06T04:59:00Z")), null);
  assert.equal(clockAction(new Date("2026-11-06T05:00:00Z")), "publish");
  assert.equal(clockAction(new Date("2026-11-07T05:00:00Z")), "publish");
  assert.equal(clockAction(new Date("2026-11-08T05:00:00Z")), null);
  assert.equal(clockAction(new Date("2026-11-08T15:00:00Z")), "prepare");
  assert.equal(clockAction(new Date("2026-11-06T19:00:00Z")), "prepare");
});
test("prepared content is hidden at 07:59 and visible at 08:00 without rebuilding", () => {
  const before = Date.parse("2026-11-05T04:59:59Z"), at = before + 1000;
  assert.ok(!getAllResearch({ now: before }).some(r => r.slug === "old-ipad-app-barriers"));
  assert.ok(getAllResearch({ now: at }).some(r => r.slug === "old-ipad-app-barriers"));
  assert.ok(!getAllDigests({ now: Date.parse("2026-10-24T04:59:59Z") }).some(d => d.slug === "2026-10-24"));
  assert.ok(getAllDigests({ now: Date.parse("2026-10-24T05:00:00Z") }).some(d => d.slug === "2026-10-24"));
});
test("digest pile and numbered poster styles remain valid, separately from article collage", () => {
  const digest = getAllDigests({ includeFuture: true }).find(d => d.slug === "2026-11-07")!;
  assert.equal(digest.coverStyle, "pile-1");
  assert.equal(hasReadyCover(digest), true);
  assert.equal(hasReadyCover({ ...digest, poster: undefined }), false);
});
test("evening preparation, delayed morning repair and explicit recovery keep the correct issue date", () => {
  assert.equal(issueDay("", "", new Date("2026-11-06T15:00:00Z")), "2026-11-07");
  assert.equal(issueDay("", "", new Date("2026-11-07T03:00:00Z")), "2026-11-07");
  assert.equal(issueDay("", "research: prepare 2026-11-09", new Date("2026-11-08T21:00:00Z")), "2026-11-09");
  assert.equal(issueDay("2026-11-06", "", new Date("2026-11-07T07:00:00Z")), "2026-11-06");
  assert.equal(digestTitle("2026-11-07"), "Неделя в исследованиях: 2–6 ноября");
});
test("the clock accepts only its dedicated key", () => {
  assert.equal(cronAuthorized("Bearer dedicated", "dedicated\n"), true);
  assert.equal(cronAuthorized("Bearer other", "dedicated"), false);
  assert.equal(cronAuthorized(null, "dedicated"), false);
  assert.equal(cronAuthorized("Bearer dedicated", undefined), false);
});
test("readiness checks the bot's actual channel posting permission without sending messages", async t => {
  const previous = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = "test-only-token";
  let canPost = false;
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    const method = new URL(url).pathname.split("/").at(-1)!;
    methods.push(method);
    return Response.json(method === "getMe" ? { ok: true, result: { id: 99 } } : { ok: true, result: { status: "administrator", can_post_messages: canPost } });
  });
  try {
    assert.equal(await checkTelegramAccess(), false);
    canPost = true; assert.equal(await checkTelegramAccess(), true);
    assert.deepEqual(methods, ["getMe", "getChatMember", "getMe", "getChatMember"]);
  } finally {
    if (previous === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = previous;
  }
});
