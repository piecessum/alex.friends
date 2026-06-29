// Ссылки на telegra.ph внутри блога ведём на внутренние лонгриды: slug лонгрида
// совпадает с последним сегментом его telegra.ph-URL (импорт берёт страницы по
// этому имени, см. scripts/import-telegraph.mjs). Если такого лонгрида на сайте
// нет — ссылку оставляем как есть (внешнюю).

const TELEGRAPH_RE = /^https?:\/\/telegra\.ph\/([^?#/]+)/i;

/** telegra.ph/<seg> → /notes/<seg>, если такой лонгрид есть; иначе исходный url. */
export function internalizeTelegraphUrl(
  url: string | undefined,
  slugs: Set<string>
): string | undefined {
  if (!url) return url;
  const seg = url.match(TELEGRAPH_RE)?.[1];
  return seg && slugs.has(seg) ? `/notes/${seg}` : url;
}

/**
 * Переписывает telegra.ph-ссылки в html-строке поста на внутренние. У внутренних
 * убираем target/rel — открываем в том же окне, как обычную навигацию по сайту.
 */
export function internalizeTelegraphLinks(html: string, slugs: Set<string>): string {
  return html.replace(
    /<a\b[^>]*\bhref="(https?:\/\/telegra\.ph\/[^"]+)"[^>]*>/gi,
    (full, url) => {
      const internal = internalizeTelegraphUrl(url, slugs);
      return internal && internal !== url ? `<a href="${internal}">` : full;
    }
  );
}
