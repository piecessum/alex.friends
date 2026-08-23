"use client";

/**
 * Один логический спойлер Telegram режет на несколько соседних <tg-spoiler>,
 * если внутри есть форматирование или эмодзи (напр. текст+картинка+текст —
 * три отдельных тега подряд). Собираем всю такую цепочку вокруг кликнутого
 * элемента, чтобы снимать блюр со всей мысли разом, а не по кусочку за клик.
 */
function spoilerGroup(el: Element): Element[] {
  const group = [el];
  for (let s = el.previousElementSibling; s?.tagName === "TG-SPOILER"; s = s.previousElementSibling) {
    group.push(s);
  }
  for (let s = el.nextElementSibling; s?.tagName === "TG-SPOILER"; s = s.nextElementSibling) {
    group.push(s);
  }
  return group;
}

// Рендерит уже санитизированный HTML поста и добавляет клик по <tg-spoiler>
// (первый клик снимает блюр, как в самом Telegram) и по раскрывающейся
// цитате blockquote[data-expandable] (аналог Telegram-цитаты expandable —
// см. lib/editor-doc-walk.ts), которая сама себе разворачивается по клику.
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
        const target = e.target as HTMLElement;

        const spoiler = target.closest("tg-spoiler");
        if (spoiler) {
          const reveal = !spoiler.classList.contains("revealed");
          for (const el of spoilerGroup(spoiler)) {
            el.classList.toggle("revealed", reveal);
          }
          return;
        }

        const quote = target.closest('blockquote[data-expandable="1"]');
        if (quote) quote.classList.toggle("revealed");
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
