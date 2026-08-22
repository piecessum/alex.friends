// Резолвинг кастомных эмодзи Telegram (<tg-emoji emoji-id="…">) через Bot API.
//
// Публичная страница t.me/s/<канал> отдаёт для кастомных эмодзи только общую
// PNG-заглушку (картинку fallback-юникода), а не реальный рисунок — поэтому
// нужен авторизованный вызов Bot API, чтобы узнать настоящий файл стикера.
// Токен уже заведён для scripts/publish-telegram.mjs; для прод-сборки его
// нужно продублировать в переменные окружения Vercel (TELEGRAM_BOT_TOKEN).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export type CustomEmojiInfo = {
  /** file_id настоящего стикера — webm-видео, если isVideo. */
  fileId: string;
  /** file_id статичного превью (jpeg/webp) — годится и для tgs (lottie), и для видео-постера. */
  thumbFileId: string;
  isVideo: boolean;
};

/** Резолвит пачку emoji-id одним запросом (лимит Bot API — 100 id за раз). */
export async function resolveCustomEmojis(
  ids: string[]
): Promise<Map<string, CustomEmojiInfo>> {
  const out = new Map<string, CustomEmojiInfo>();
  if (!TOKEN || ids.length === 0) return out;

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TOKEN}/getCustomEmojiStickers`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ custom_emoji_ids: chunk }),
          next: { revalidate: 86400 },
        }
      );
      const data = await res.json();
      if (!data.ok) continue;
      for (const s of data.result as Array<{
        custom_emoji_id: string;
        file_id: string;
        is_video?: boolean;
        thumbnail?: { file_id: string };
        thumb?: { file_id: string };
      }>) {
        out.set(s.custom_emoji_id, {
          fileId: s.file_id,
          thumbFileId: s.thumbnail?.file_id ?? s.thumb?.file_id ?? s.file_id,
          isVideo: !!s.is_video,
        });
      }
    } catch {
      // сеть подвела — эти id останутся неразрешёнными, рендер уйдёт в фолбэк-юникод
    }
  }
  return out;
}

/** file_path в Telegram по file_id — нужен, чтобы скачать сами байты файла. */
export async function getFilePath(fileId: string): Promise<string | null> {
  if (!TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`,
      { next: { revalidate: 86400 } }
    );
    const data = await res.json();
    return data.ok ? data.result.file_path : null;
  } catch {
    return null;
  }
}
