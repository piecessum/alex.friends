// Тип пина и ссылки на картинки CDN Pinterest — отдельно от lib/pinterest.ts
// (там node:fs), чтобы их можно было импортировать в клиентские компоненты.

export type Pin = {
  id: string;
  /** Путь картинки на i.pinimg.com без размера: «11/69/1b/<hash>.jpg». */
  img: string;
  /** Пропорции (по версии 736x) — чтобы сетка не прыгала при загрузке. */
  w: number;
  h: number;
  /** Средний цвет — заливка места, пока картинка грузится. */
  color?: string;
  title?: string;
};

const SIZES = [236, 474, 736] as const;

export function pinSrc(pin: Pin, size: (typeof SIZES)[number] = 474): string {
  return `https://i.pinimg.com/${size}x/${pin.img}`;
}

export function pinSrcSet(pin: Pin): string {
  return SIZES.map((s) => `${pinSrc(pin, s)} ${s}w`).join(", ");
}

export function pinUrl(pin: Pin): string {
  return `https://www.pinterest.com/pin/${pin.id}/`;
}
