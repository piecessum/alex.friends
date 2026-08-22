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
        if (!spoiler) return;
        const reveal = !spoiler.classList.contains("revealed");
        for (const el of spoilerGroup(spoiler)) {
          el.classList.toggle("revealed", reveal);
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
