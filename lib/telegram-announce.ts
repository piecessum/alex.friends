// Анонс лонгрида в Telegram-канале — обложка + подпись + кнопка «Читать на
// сайте», аналог того, что уже делает scripts/publish-telegram.mjs для уже
// написанных заметок, но встроено в веб-публикацию (полный контент лонгрида
// в Telegram не переносится, только анонс — так и было задумано).

import { sendMessage, sendPhoto } from "./telegram-bot";
import { extractImages, dataUrlToBuffer } from "./editor-images";
import { getRepoFile } from "./github-commit";
import { slugifyTitle } from "./slugify";
import { escapeHtml, type PMNode } from "./editor-doc-walk";

export class AnnounceError extends Error {}

function channelUrl(messageId: number): string {
  const channel = (process.env.TELEGRAM_CHANNEL || "@ux_review").replace(/^@/, "");
  return `https://t.me/${channel}/${messageId}`;
}

async function uniqueSlug(base: string): Promise<string> {
  const raw = await getRepoFile("content/notes/index.json");
  const existing = new Set<string>(
    raw ? (JSON.parse(raw) as { slug: string }[]).map((n) => n.slug) : []
  );
  if (!existing.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
}

export type AnnounceResult = { messageId: number; url: string; slug: string };

export async function publishNoteAnnounce(
  title: string,
  doc: PMNode
): Promise<AnnounceResult> {
  const trimmed = title.trim();
  if (!trimmed) throw new AnnounceError("У лонгрида должен быть заголовок");

  const slug = await uniqueSlug(slugifyTitle(trimmed));
  const siteUrl = (process.env.SITE_URL || "https://alex-friends.vercel.app").replace(/\/$/, "");
  const readUrl = `${siteUrl}/notes/${slug}`;
  const caption = `<b>${escapeHtml(trimmed)}</b>`;
  const replyMarkup = { inline_keyboard: [[{ text: "Читать на сайте →", url: readUrl }]] };

  const cover = extractImages(doc)[0];

  if (cover) {
    const { buffer, ext } = dataUrlToBuffer(cover.dataUrl);
    const sent = await sendPhoto({ photo: buffer, filename: `cover.${ext}`, caption, replyMarkup });
    return { messageId: sent.message_id, url: channelUrl(sent.message_id), slug };
  }

  const sent = await sendMessage({ text: caption, replyMarkup });
  return { messageId: sent.message_id, url: channelUrl(sent.message_id), slug };
}
