import { NextResponse } from "next/server";
import { docToPostHtml } from "@/lib/editor-to-post-html";
import { docToNoteNodes } from "@/lib/editor-to-notenodes";
import { convertNoteImages } from "@/lib/notes-images";
import { serializeChannelPosts } from "@/lib/channel-posts";
import { commitFiles, getRepoFile, type CommitFile } from "@/lib/github-commit";
import type { PMNode } from "@/lib/editor-doc-walk";
import type { TgPost } from "@/lib/telegram";
import type { Note, NoteIndexItem, NoteNode } from "@/lib/notes";

// Фаза Б публикации: конвертировать контент и закоммитить на сайт (Vercel
// передеплоит сам). Принимает telegramResult из фазы А (см.
// app/api/admin/publish/route.ts) — для лонгрида там уже готовый slug.

type TelegramResult = { messageId: number; url: string; photoFileIds?: string[]; slug?: string };

function extractTags(text: string): string[] {
  return [
    ...new Set(
      [...text.matchAll(/#([\p{L}\p{N}_]+)/giu)]
        .map((m) => m[1].toLowerCase())
        .filter((t) => t && !/^\d+$/.test(t))
    ),
  ];
}

function plainTextOf(nodes: NoteNode[] | undefined): string {
  if (!nodes) return "";
  return nodes.map((n) => (typeof n === "string" ? n : plainTextOf(n.children))).join(" ");
}

function firstImageSrc(nodes: NoteNode[] | undefined): string | null {
  if (!nodes) return null;
  for (const n of nodes) {
    if (typeof n === "string") continue;
    if (n.tag === "img" && n.attrs?.src) return n.attrs.src;
    const found = firstImageSrc(n.children);
    if (found) return found;
  }
  return null;
}

async function commitShortPost(doc: PMNode, telegramResult: TelegramResult) {
  const html = docToPostHtml(doc);
  const tags = extractTags(html.replace(/<[^>]+>/g, " "));
  const photos = (telegramResult.photoFileIds ?? []).map((id) => `/api/tg-post-image/${id}`);

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

  return commitFiles({
    message: `post: ${summary}`,
    files: [
      { path: "content/channel-posts.json", content: serializeChannelPosts(posts), encoding: "utf-8" },
    ],
  });
}

async function commitNote(doc: PMNode, title: string, telegramResult: TelegramResult) {
  const slug = telegramResult.slug;
  if (!slug) throw new Error("Нет slug лонгрида (ожидался из фазы А)");

  const { doc: convertedDoc, files: imageFiles } = await convertNoteImages(doc);
  const content = docToNoteNodes(convertedDoc);

  const now = new Date();
  const note: Note = {
    slug,
    title: title.trim(),
    author: "Алексей Масюта",
    views: 0,
    month: now.getMonth() + 1,
    day: now.getDate(),
    year: now.getFullYear(),
    original: "",
    content,
  };

  const plain = plainTextOf(content).replace(/\s+/g, " ").trim();
  const excerpt = plain.length > 200 ? plain.slice(0, 200).trimEnd() + "…" : plain;
  const indexItem: NoteIndexItem = {
    slug,
    title: note.title,
    month: note.month,
    day: note.day,
    year: note.year,
    excerpt,
    cover: firstImageSrc(content),
    tags: [], // подмешиваются на чтении из _telegram-log.json, см. lib/notes.ts
  };

  const indexRaw = await getRepoFile("content/notes/index.json");
  const index: NoteIndexItem[] = indexRaw ? JSON.parse(indexRaw) : [];
  if (index.some((n) => n.slug === slug)) {
    throw new Error(`Лонгрид с slug ${slug} уже существует — публикация прервана`);
  }
  const newIndex = [indexItem, ...index].map(({ slug, title, month, day, year, excerpt, cover }) => ({
    slug, title, month, day, year, excerpt, cover,
  }));

  const logRaw = await getRepoFile("content/notes/_telegram-log.json");
  const log = logRaw ? JSON.parse(logRaw) : {};
  log[slug] = {
    message_id: telegramResult.messageId,
    date: now.toISOString(),
    url: telegramResult.url,
    tags: extractTags(note.title),
  };

  const files: CommitFile[] = [
    { path: `content/notes/${slug}.json`, content: JSON.stringify(note, null, 2) + "\n", encoding: "utf-8" },
    { path: "content/notes/index.json", content: JSON.stringify(newIndex, null, 2) + "\n", encoding: "utf-8" },
    { path: "content/notes/_telegram-log.json", content: JSON.stringify(log, null, 2) + "\n", encoding: "utf-8" },
    ...imageFiles,
  ];

  return commitFiles({ message: `note: ${note.title}`, files });
}

export async function POST(req: Request) {
  const body = await req.json();
  const doc = body.doc as PMNode | undefined;
  const mode = body.mode === "note" ? "note" : "short";
  const telegramResult = body.telegramResult as TelegramResult | undefined;
  if (!doc || !telegramResult) {
    return NextResponse.json({ error: "doc и telegramResult обязательны" }, { status: 400 });
  }

  try {
    const result =
      mode === "note"
        ? await commitNote(doc, String(body.title ?? ""), telegramResult)
        : await commitShortPost(doc, telegramResult);
    return NextResponse.json({ commit: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка коммита на сайт" },
      { status: 400 }
    );
  }
}
