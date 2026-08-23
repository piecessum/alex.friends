import { NextResponse } from "next/server";
import { docToPostHtml } from "@/lib/editor-to-post-html";
import { serializeChannelPosts } from "@/lib/channel-posts";
import { commitFiles, getRepoFile } from "@/lib/github-commit";
import type { PMNode } from "@/lib/editor-doc-walk";
import type { TgPost } from "@/lib/telegram";

// Фаза Б публикации: конвертировать контент в TgPost и закоммитить в
// content/channel-posts.json — Vercel передеплоит сайт сам. Принимает
// telegramResult из фазы А (см. app/api/admin/publish/route.ts).

type TelegramResult = { messageId: number; url: string; photoFileIds?: string[] };

function extractTags(html: string): string[] {
  const plain = html.replace(/<[^>]+>/g, " ");
  return [
    ...new Set(
      [...plain.matchAll(/#([\p{L}\p{N}_]+)/giu)]
        .map((m) => m[1].toLowerCase())
        .filter((t) => t && !/^\d+$/.test(t))
    ),
  ];
}

export async function POST(req: Request) {
  const body = await req.json();
  const doc = body.doc as PMNode | undefined;
  const telegramResult = body.telegramResult as TelegramResult | undefined;
  if (!doc || !telegramResult) {
    return NextResponse.json(
      { error: "doc и telegramResult обязательны" },
      { status: 400 }
    );
  }

  const html = docToPostHtml(doc);
  const tags = extractTags(html);
  const photos = (telegramResult.photoFileIds ?? []).map(
    (id) => `/api/tg-post-image/${id}`
  );

  const post: TgPost = {
    id: String(telegramResult.messageId),
    url: telegramResult.url,
    date: new Date().toISOString(),
    html,
    photos,
    videos: [],
    tags,
  };

  const currentRaw = await getRepoFile("content/channel-posts.json");
  const current: TgPost[] = currentRaw ? JSON.parse(currentRaw) : [];
  const posts = [post, ...current];
  const summary = html.replace(/<[^>]+>/g, " ").trim().slice(0, 60) || post.id;

  const result = await commitFiles({
    message: `post: ${summary}`,
    files: [
      {
        path: "content/channel-posts.json",
        content: serializeChannelPosts(posts),
        encoding: "utf-8",
      },
    ],
  });

  return NextResponse.json({ commit: result });
}
