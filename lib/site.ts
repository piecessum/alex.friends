/**
 * Внешние ссылки сайта. Здесь же — перелинковка с сайтом-резюме.
 *
 * TODO: подставь реальные домены после деплоя на Vercel.
 * Можно переопределить через переменную окружения NEXT_PUBLIC_RESUME_URL,
 * не трогая код.
 */
export const RESUME_URL =
  process.env.NEXT_PUBLIC_RESUME_URL ?? "https://alex-resume.vercel.app";

export const links = {
  /** Сайт-резюме (для работодателя) */
  resume: RESUME_URL,
  /** Телеграм-канал про UX */
  channel: "https://t.me/ux_review",
  /** Вишлист в боте */
  wishlist: "https://t.me/WishesListBot?start=MjU5NTM3OTU0",
  /** Личный телеграм для связи */
  telegram: "https://t.me/pieces_sum",
} as const;
