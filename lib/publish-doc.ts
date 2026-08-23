// Оркестрация отправки документа редактора в Telegram (фаза А публикации,
// см. app/api/admin/publish/route.ts): без картинок — обычное сообщение,
// с одной картинкой — sendPhoto (подпись, если влезает в лимит caption),
// с несколькими — sendMediaGroup (альбом, подпись на первом элементе).

import { sendMessage, sendPhoto, sendMediaGroup } from "./telegram-bot";
import { docToTelegramHtml, CAPTION_LIMIT, MESSAGE_LIMIT } from "./editor-to-telegram-html";
import { extractImages, dataUrlToBuffer } from "./editor-images";
import type { PMNode } from "./editor-doc-walk";
import type { SentMessage } from "./telegram-bot";

export class PublishError extends Error {}

export type TelegramPublishResult = {
  messageId: number;
  url: string;
  /** file_id всех отправленных фото (по одному на каждую картинку поста). */
  photoFileIds?: string[];
};

function channelUrl(messageId: number): string {
  const channel = (process.env.TELEGRAM_CHANNEL || "@ux_review").replace(/^@/, "");
  return `https://t.me/${channel}/${messageId}`;
}

function lastFileId(sent: SentMessage): string {
  const id = sent.photo?.at(-1)?.file_id;
  if (!id) throw new PublishError("Telegram не вернул file_id отправленного фото");
  return id;
}

export async function publishDocToTelegram(doc: PMNode): Promise<TelegramPublishResult> {
  const images = extractImages(doc);
  const { text, overLimit } = docToTelegramHtml(doc);

  if (images.length === 0) {
    if (!text) throw new PublishError("Пустой пост");
    if (overLimit) {
      throw new PublishError(
        `Текст длиннее ${MESSAGE_LIMIT} символов — одним сообщением Bot API не отправить`
      );
    }
    const sent = await sendMessage({ text });
    return { messageId: sent.message_id, url: channelUrl(sent.message_id) };
  }

  if (images.length === 1) {
    const { buffer, ext } = dataUrlToBuffer(images[0].dataUrl);
    if (text.length > CAPTION_LIMIT) {
      // Подпись не влезает под фото — фото без подписи, текст отдельным
      // сообщением (как уже делает scripts/publish-telegram.mjs для анонсов).
      if (text.length > MESSAGE_LIMIT) {
        throw new PublishError(`Текст длиннее ${MESSAGE_LIMIT} символов — не влезет даже отдельным сообщением`);
      }
      const sentPhoto = await sendPhoto({ photo: buffer, filename: `photo.${ext}` });
      await sendMessage({ text });
      return {
        messageId: sentPhoto.message_id,
        url: channelUrl(sentPhoto.message_id),
        photoFileIds: [lastFileId(sentPhoto)],
      };
    }
    const sent = await sendPhoto({
      photo: buffer,
      filename: `photo.${ext}`,
      caption: text || undefined,
    });
    return {
      messageId: sent.message_id,
      url: channelUrl(sent.message_id),
      photoFileIds: [lastFileId(sent)],
    };
  }

  if (images.length > 10) {
    throw new PublishError("В альбоме Bot API можно отправить не больше 10 картинок");
  }
  if (text.length > CAPTION_LIMIT) {
    throw new PublishError(
      `Подпись к альбому длиннее ${CAPTION_LIMIT} символов — сократи текст`
    );
  }
  const photos = images.map((img, i) => {
    const { buffer, ext } = dataUrlToBuffer(img.dataUrl);
    return { buffer, filename: `photo${i}.${ext}` };
  });
  const sentGroup = await sendMediaGroup({ photos, caption: text || undefined });
  const first = sentGroup[0];
  return {
    messageId: first.message_id,
    url: channelUrl(first.message_id),
    photoFileIds: sentGroup.map(lastFileId),
  };
}
