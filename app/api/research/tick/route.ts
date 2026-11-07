import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAllDigests, getAllResearch } from "@/lib/research";
import { checkTelegramAccess, cronAuthorized, deliverOnce, githubResearch, hasReadyCover, markPosted, publicationSlot, sendTelegramPhoto } from "@/lib/research-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SITE = "https://alex-friends.vercel.app";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function requestIssue(day: string, slot: string) {
  const { api, owner, repo, branch } = githubResearch();
  try {
    await api.repos.createOrUpdateFileContents({ owner, repo, branch,
      path: `.openai/research-ticks/${day}-${slot}.json`,
      message: `research: prepare ${day}`,
      content: Buffer.from(JSON.stringify({ day, requestedAt: new Date().toISOString() }) + "\n").toString("base64"),
      author: { name: "Алексей Масюта", email: "alexmas1998kot@gmail.com" },
    });
    return "requested";
  } catch (error) {
    if ([409, 422].includes((error as { status: number }).status)) return "already-requested";
    throw error;
  }
}

export async function POST(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const slot = publicationSlot();
  try {
    if (body.action === "prepare") {
      const tomorrow = new Date(`${slot.day}T12:00:00+03:00`);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + (slot.hour >= 12 ? 1 : 0));
      const day = tomorrow.toISOString().slice(0, 10);
      if (tomorrow.getUTCDay() === 0) return NextResponse.json({ state: "Sunday off" });
      return NextResponse.json({ day, state: await requestIssue(day, `evening-${slot.hour >= 20 ? "late" : "early"}`) });
    }
    if (body.action !== "publish" && body.action !== "check") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    if (slot.weekday === 0 && body.action !== "check") return NextResponse.json({ state: "Sunday off", day: slot.day });
    const kind = slot.weekday === 6 ? "digest" as const : "article" as const;
    const articles = getAllResearch({ includeFuture: true });
    const issue = kind === "digest"
      ? getAllDigests({ includeFuture: true }).find(d => d.slug === slot.day)
      : articles.find(r => publicationSlot(new Date(r.telegramAt ?? r.date)).day === slot.day);
    const cover = issue && ("items" in issue ? issue.poster : issue.cover);
    if (body.action === "check") {
      const botCanPost = await checkTelegramAccess();
      if (botCanPost && typeof body.probe === "string" && /^\d{6,24}$/.test(body.probe)) {
        const { api, owner, repo, branch } = githubResearch();
        try {
          await api.repos.createOrUpdateFileContents({ owner, repo, branch,
            path: `.openai/research-clock/${body.probe}.json`, message: "research: cloud clock verified",
            content: Buffer.from(JSON.stringify({ receivedAt: new Date().toISOString(), scheduledAt: body.scheduledAt, probe: body.probe, botCanPost, ready: hasReadyCover(issue) }) + "\n").toString("base64"),
            author: { name: "Алексей Масюта", email: "alexmas1998kot@gmail.com" },
          });
        } catch (error) { if (![409, 422].includes((error as { status: number }).status)) throw error; }
      }
      return NextResponse.json({ day: slot.day, kind, ready: hasReadyCover(issue), published: !!issue?.telegram, slug: issue?.slug, botCanPost }, { status: botCanPost ? 200 : 503 });
    }
    if (slot.hour < 8) return NextResponse.json({ state: "Not before 08:00 Moscow", day: slot.day });
    if (issue?.telegram) return NextResponse.json({ state: "already-published", day: slot.day, messageId: issue.telegram.messageId });
    if (!issue || !cover || !hasReadyCover(issue)) {
      await requestIssue(slot.day, "morning-repair");
      return NextResponse.json({ error: "Issue not ready; repair requested", day: slot.day, kind }, { status: 503 });
    }
    const response = await fetch(`${SITE}${cover}`, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error("Cover is not deployed");
    const jpeg = await sharp(Buffer.from(await response.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
    let caption: string;
    if ("items" in issue) {
      const bySlug = new Map(articles.map(r => [r.slug, r]));
      caption = "<b>Дайджест недели</b>\n\n" + issue.items.map((item, i) => {
        const article = bySlug.get(item.slug);
        if (!article) throw new Error("Digest article missing");
        return `${i + 1}. <a href="${SITE}/research/${article.slug}">${esc(article.title)}</a>`;
      }).join("\n");
    } else caption = `<b>${esc(issue.title)}</b>\n\n${esc(issue.dek)}\n\n<a href="${SITE}/research/${issue.slug}">Читать на сайте →</a>`;
    if (caption.replace(/<[^>]+>/g, "").length > 1024) throw new Error("Caption too long");
    const messageId = await deliverOnce({ kind, day: slot.day, slug: issue.slug }, () => sendTelegramPhoto(jpeg, caption));
    await markPosted(`content/research/${kind === "digest" ? "digests/" : ""}${issue.slug}.json`, { messageId, postedAt: new Date().toISOString(), cover });
    return NextResponse.json({ state: "published", day: slot.day, kind, messageId });
  } catch (error) {
    console.error("Research clock:", error instanceof Error ? error.message : "Delivery failed");
    return NextResponse.json({ error: "Research clock operation failed", day: slot.day }, { status: 503 });
  }
}
