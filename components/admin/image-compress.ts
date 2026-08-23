// Сжатие картинки на клиенте перед вставкой в редактор — телефонные фото
// весят по 5–10 МБ, а тело запроса публикации (JSON с base64) не должно
// упираться в лимит размера serverless-функции. Уменьшаем длинную сторону и
// перекодируем в JPEG — Telegram всё равно сам пережимает обычные фото
// (sendPhoto), так что потери незаметны.

export type CompressedImage = { dataUrl: string; width: number; height: number };

export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.85
): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D-контекст canvas недоступен");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return { dataUrl: canvas.toDataURL("image/jpeg", quality), width: w, height: h };
}
