"use client";

// Рендерит уже санитизированный HTML поста и добавляет клик по <tg-spoiler>:
// первый клик снимает блюр текста, как в самом Telegram.
export function SpoilerHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      onClick={(e) => {
        const spoiler = (e.target as HTMLElement).closest("tg-spoiler");
        spoiler?.classList.toggle("revealed");
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
