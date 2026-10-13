// Вырезка объекта из фото нейросетью-сегментатором BiRefNet (лицензия MIT),
// локально через transformers.js — без ключей и бесплатно. В отличие от
// старой вырезки «по цвету фона» не съедает белые и серебристые части
// предмета (циферблат, хром, бумагу) и справляется с фото на любом фоне —
// поэтому годится и для стоковых снимков.
//
// Модель (~160 МБ) скачивается один раз в .cache/models (в CI — кэшируется).
// Используется только скриптами (scripts/research-cover.ts), не сайтом.

import path from "node:path";
import sharp from "sharp";

const MODEL = "onnx-community/BiRefNet_lite-ONNX";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loaded: Promise<{ model: any; processor: any; RawImage: any }> | null = null;

function load() {
  loaded ??= (async () => {
    const { AutoModel, AutoProcessor, RawImage, env } = await import("@huggingface/transformers");
    env.cacheDir = path.join(process.cwd(), ".cache", "models");
    const model = await AutoModel.from_pretrained(MODEL, { dtype: "fp32" });
    const processor = await AutoProcessor.from_pretrained(MODEL);
    return { model, processor, RawImage };
  })();
  return loaded;
}

export type Cutout = {
  /** PNG с прозрачным фоном. */
  png: Buffer;
  /** Доля кадра, которую занимает объект (0–1). */
  coverage: number;
  /** Сколько краёв кадра объект заметно касается (0–4): 0 — целиком в кадре. */
  edges: number;
};

/** Вырезает главный объект фото. */
export async function cutout(input: Buffer): Promise<Cutout> {
  const { model, processor, RawImage } = await load();
  // Модели нужен RGB; большие фото заранее уменьшаем — маска всё равно 1024px.
  const rgb = await sharp(input).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" }).png().toBuffer();
  const { width: w = 0, height: h = 0 } = await sharp(rgb).metadata();
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(rgb)]));
  const { pixel_values } = await processor(image);
  const out = await model({ input_image: pixel_values });
  const logits = Object.values(out)[0] as { sigmoid(): { mul(n: number): { to(t: string): unknown } } } & {
    [i: number]: unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mask = await RawImage.fromTensor((logits as any)[0].sigmoid().mul(255).to("uint8")).resize(w, h);
  const alpha: Uint8Array = mask.data;

  // Оценка кадра: площадь объекта и касание краёв (обрезанный в кадре предмет).
  let on = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] >= 128) on++;
  const edgeShare = (pixels: number[]) => pixels.filter((p) => alpha[p] >= 128).length / pixels.length;
  const top = Array.from({ length: w }, (_, x) => x);
  const bottom = top.map((x) => (h - 1) * w + x);
  const left = Array.from({ length: h }, (_, y) => y * w);
  const right = left.map((p) => p + w - 1);
  const edges = [top, bottom, left, right].filter((e) => edgeShare(e) > 0.08).length;

  const raw = await sharp(rgb).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = raw[i * 3];
    rgba[i * 4 + 1] = raw[i * 3 + 1];
    rgba[i * 4 + 2] = raw[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  const png = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return { png, coverage: on / (w * h), edges };
}
