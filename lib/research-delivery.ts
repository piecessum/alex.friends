import { Octokit } from "@octokit/rest";
import crypto from "node:crypto";
import { COVER_STYLE, type Research, type ResearchDigest } from "./research";

export function hasReadyCover(issue: Research | ResearchDigest | undefined): boolean {
  if (!issue) return false;
  // Digest collage and numbered poster have their own style versions.
  return "items" in issue ? !!issue.poster && !!issue.cover && !!issue.posterKey : !!issue.cover && issue.coverStyle === COVER_STYLE;
}

export type DeliveryIssue = { kind: "article" | "digest"; day: string; slug: string };
type Receipt = DeliveryIssue & { state: "sending" | "sent" | "retryable" | "uncertain"; at: string; messageId?: number };
export interface ReceiptStore {
  get(issue: DeliveryIssue): Promise<{ value: Receipt; sha: string } | null>;
  put(issue: DeliveryIssue, value: Receipt, sha?: string): Promise<string>;
}
export class TelegramRejected extends Error {}

export function githubResearch() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error("GitHub delivery access is missing");
  return {
    api: new Octokit({ auth: token }), owner: process.env.GITHUB_OWNER || "piecessum",
    repo: process.env.GITHUB_REPO || "alex.friends", branch: process.env.GITHUB_BRANCH || "main",
  };
}

export function receiptStore(): ReceiptStore {
  const { api, owner, repo, branch } = githubResearch();
  const location = (issue: DeliveryIssue) => `.openai/research-delivery/${issue.day}-${issue.kind}.json`;
  return {
    async get(issue) {
      try {
        const { data } = await api.repos.getContent({ owner, repo, ref: branch, path: location(issue) });
        if (Array.isArray(data) || !("content" in data)) throw new Error("Invalid delivery record");
        return { value: JSON.parse(Buffer.from(data.content, "base64").toString()) as Receipt, sha: data.sha };
      } catch (error) { if ((error as { status?: number }).status === 404) return null; throw error; }
    },
    async put(issue, value, sha) {
      const { data } = await api.repos.createOrUpdateFileContents({ owner, repo, branch, path: location(issue), sha,
        message: `research: delivery ${issue.day} ${value.state}`,
        content: Buffer.from(JSON.stringify(value, null, 2) + "\n").toString("base64"),
        author: { name: "Алексей Масюта", email: "alexmas1998kot@gmail.com" },
      });
      return data.content!.sha!;
    },
  };
}

/** A shared atomic receipt prevents a Worker and a GitHub fallback from posting twice. */
export async function deliverOnce(issue: DeliveryIssue, send: () => Promise<number>, store: ReceiptStore = receiptStore()): Promise<number> {
  const existing = await store.get(issue);
  if (existing && existing.value.slug !== issue.slug) throw new Error("Another issue already owns this publication slot");
  if (existing?.value.state === "sent" && existing.value.messageId) return existing.value.messageId;
  if (existing && existing.value.state !== "retryable") throw new Error("Delivery is in progress or needs reconciliation; refusing a duplicate");
  let sha: string;
  const claim: Receipt = { ...issue, state: "sending", at: new Date().toISOString() };
  try { sha = await store.put(issue, claim, existing?.sha); }
  catch (error) {
    const receipt = await store.get(issue);
    if (receipt?.value.slug === issue.slug && receipt.value.state === "sent" && receipt.value.messageId) return receipt.value.messageId;
    throw error;
  }
  let messageId: number;
  try { messageId = await send(); }
  catch (error) {
    // Telegram's explicit rejection is safe to retry. An interrupted response is ambiguous.
    await store.put(issue, { ...claim, state: error instanceof TelegramRejected ? "retryable" : "uncertain" }, sha);
    throw error;
  }
  await store.put(issue, { ...claim, state: "sent", messageId }, sha);
  return messageId;
}

export function cronAuthorized(header: string | null, secret = process.env.RESEARCH_CRON_SECRET) {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7)), b = Buffer.from(secret.trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function publicationSlot(now = new Date()) {
  const msk = new Date(now.getTime() + 3 * 3600_000);
  return { day: msk.toISOString().slice(0, 10), weekday: msk.getUTCDay(), hour: msk.getUTCHours(), minute: msk.getUTCMinutes() };
}

export async function checkTelegramAccess() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const botResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(10_000) });
  const bot = await botResponse.json();
  if (!bot.ok) return false;
  const chat = new URLSearchParams({ chat_id: process.env.RESEARCH_CHANNEL_ID || "-1004400783573", user_id: String(bot.result.id) });
  const memberResponse = await fetch(`https://api.telegram.org/bot${token}/getChatMember?${chat}`, { signal: AbortSignal.timeout(10_000) });
  const member = await memberResponse.json();
  return !!member.ok && ["administrator", "creator"].includes(member.result.status) && member.result.can_post_messages !== false;
}

export async function sendTelegramPhoto(photo: Buffer, caption: string): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new TelegramRejected("Telegram token is missing");
  const form = new FormData();
  form.set("chat_id", process.env.RESEARCH_CHANNEL_ID || "-1004400783573");
  form.set("caption", caption); form.set("parse_mode", "HTML");
  form.set("photo", new Blob([new Uint8Array(photo)]), "cover.jpg");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form, signal: AbortSignal.timeout(25_000) });
  const data = await response.json();
  if (!data.ok) throw new TelegramRejected(`Telegram rejected publication (${data.error_code})`);
  return data.result.message_id;
}

export async function markPosted(file: string, telegram: NonNullable<Research["telegram"]>) {
  const { api, owner, repo, branch } = githubResearch();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data } = await api.repos.getContent({ owner, repo, path: file, ref: branch });
    if (Array.isArray(data) || !("content" in data)) throw new Error("Issue metadata is unavailable");
    const value = JSON.parse(Buffer.from(data.content, "base64").toString()) as Research | ResearchDigest;
    if (value.telegram?.messageId === telegram.messageId) return;
    value.telegram = telegram;
    try {
      await api.repos.createOrUpdateFileContents({ owner, repo, branch, path: file, sha: data.sha,
        message: "research: опубликовано в канал", content: Buffer.from(JSON.stringify(value, null, 2) + "\n").toString("base64"),
        author: { name: "Алексей Масюта", email: "alexmas1998kot@gmail.com" },
      }); return;
    } catch (error) { if ((error as { status?: number }).status !== 409 || attempt === 2) throw error; }
  }
}
