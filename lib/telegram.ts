// Чтение публичной ленты Telegram-канала через веб-превью t.me/s/<channel>.
// Без API-ключей. Кэшируется на час (новые посты подтягиваются сами).

export const CHANNEL = "ux_review";

export type TgVideo = { thumb?: string; duration?: string };
export type TgLinkPreview = {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  site?: string;
};
export type TgForward = { name: string; url?: string };
export type TgPost = {
  id: string;
  url: string;
  date: string;
  html: string;
  photos: string[];
  videos: TgVideo[];
  link?: TgLinkPreview;
  forward?: TgForward;
  views?: string;
  /** Хэштеги из текста поста, без `#`, в нижнем регистре. */
  tags: string[];
};
export type TgPage = { posts: TgPost[]; nextBefore: string | null };

/** Хэштеги поста — из ссылок Telegram (?q=%23tag) и из текста. */
function extractTags(html: string): string[] {
  const set = new Set<string>();
  const fromLinks = [...html.matchAll(/q=%23([^"&'\s<>]+)/gi)].map((m) =>
    decodeURIComponent(m[1])
  );
  const stripped = html.replace(/<[^>]+>/g, " ");
  const fromText = [...stripped.matchAll(/#([\p{L}\p{N}_]+)/giu)].map((m) => m[1]);
  for (const t of [...fromLinks, ...fromText]) {
    const k = t.toLowerCase();
    if (k && !/^\d+$/.test(k)) set.add(k);
  }
  return [...set];
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const ALLOWED = new Set([
  "a", "b", "strong", "i", "em", "u", "s", "del", "code", "pre", "br",
  "blockquote",
]);

/** Оставляем только безопасный набор инлайн-тегов; у ссылок — только href. */
function sanitize(html: string): string {
  let out = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*?href="([^"]*)"[^>]*>/gi,
      (_m, href) => `<a href="${href}" target="_blank" rel="noopener noreferrer">`);
  // прочие теги: разрешённые — чистим атрибуты, остальные — выкидываем (текст оставляем)
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g, (tag, name) => {
    const n = String(name).toLowerCase();
    if (n === "a") return tag.startsWith("</") ? "</a>" : tag;
    if (!ALLOWED.has(n)) return "";
    return tag.startsWith("</") ? `</${n}>` : `<${n}>`;
  });
  return out.trim();
}

function field(block: string, re: RegExp): string | undefined {
  const m = block.match(re);
  return m ? m[1] : undefined;
}

const stripTags = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

/** Пересланный пост: имя источника и (если есть) ссылка. */
function parseForward(block: string): TgForward | undefined {
  if (!/tgme_widget_message_forwarded_from_name/.test(block)) return undefined;
  const withLink = block.match(
    /tgme_widget_message_forwarded_from_name"\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/
  );
  if (withLink) return { url: withLink[1], name: stripTags(withLink[2]) };
  const noLink = block.match(
    /tgme_widget_message_forwarded_from_name[^>]*>([\s\S]*?)<\/(?:a|span)>/
  );
  return noLink ? { name: stripTags(noLink[1]) } : undefined;
}

function parse(html: string): TgPost[] {
  const marks: { id: string; at: number }[] = [];
  const re = /data-post="ux_review\/(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) marks.push({ id: m[1], at: m.index });

  const posts: TgPost[] = [];
  for (let i = 0; i < marks.length; i++) {
    const id = marks[i].id;
    const block = html.slice(marks[i].at, marks[i + 1]?.at ?? html.length);

    const textRaw = field(
      block,
      /tgme_widget_message_text js-message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/
    );
    const html_ = textRaw ? sanitize(textRaw.replace(/<br\s*\/?>/gi, "\n")) : "";

    const photos = [
      ...block.matchAll(
        /tgme_widget_message_photo_wrap[^"]*"[^>]*background-image:url\('([^']+)'\)/g
      ),
    ].map((x) => x[1]);

    const vThumbs = [
      ...block.matchAll(
        /tgme_widget_message_video_thumb[^"]*"[^>]*background-image:url\('([^']+)'\)/g
      ),
    ].map((x) => x[1]);
    const durations = [
      ...block.matchAll(/video_duration[^>]*>([^<]+)</g),
    ].map((x) => x[1]);
    const hasVideo =
      vThumbs.length > 0 || /tgme_widget_message_video/.test(block);
    const videos: TgVideo[] = hasVideo
      ? (vThumbs.length ? vThumbs : [undefined]).map((thumb, idx) => ({
          thumb,
          duration: durations[idx],
        }))
      : [];

    let link: TgLinkPreview | undefined;
    if (/tgme_widget_message_link_preview/.test(block)) {
      link = {
        url: field(block, /class="tgme_widget_message_link_preview"[^>]*href="([^"]+)"/),
        site: field(block, /tgme_widget_message_site_name[^>]*>([^<]+)</),
        title: field(block, /tgme_widget_message_link_preview_title[^>]*>([\s\S]*?)<\/div>/)?.replace(/<[^>]+>/g, ""),
        description: field(block, /tgme_widget_message_link_preview_description[^>]*>([\s\S]*?)<\/div>/)?.replace(/<[^>]+>/g, ""),
        image: field(block, /link_preview_image[^"]*"[^>]*background-image:url\('([^']+)'\)/),
      };
    }

    posts.push({
      id,
      url: `https://t.me/${CHANNEL}/${id}`,
      date: field(block, /<time datetime="([^"]+)"/) ?? "",
      html: html_,
      photos,
      videos,
      link,
      forward: parseForward(block),
      views: field(block, /tgme_widget_message_views">([^<]+)</),
      tags: extractTags(textRaw ?? ""),
    });
  }
  return posts;
}

export async function fetchChannel(before?: string): Promise<TgPage> {
  const url =
    `https://t.me/s/${CHANNEL}` + (before ? `?before=${before}` : "");
  const res = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "ru,en" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return { posts: [], nextBefore: null };

  const ascending = parse(await res.text());
  if (ascending.length === 0) return { posts: [], nextBefore: null };

  const oldest = ascending[0].id; // лента приходит по возрастанию id
  const posts = ascending.reverse(); // показываем новые сверху
  return { posts, nextBefore: oldest };
}

/**
 * Вытаскивает все доступные посты канала, проходя по страницам `?before=`.
 * Каждая страница кэшируется на час через `revalidate`, общий результат
 * получается из тёплого кэша почти мгновенно.
 */
export async function fetchAllPosts(): Promise<TgPost[]> {
  const seen = new Set<string>();
  const all: TgPost[] = [];
  let before: string | undefined;
  // Жёсткая верхняя граница, чтоб защититься от зацикливания.
  for (let i = 0; i < 40; i++) {
    const page = await fetchChannel(before);
    let added = 0;
    for (const p of page.posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      all.push(p);
      added++;
    }
    if (!page.nextBefore || added === 0) break;
    before = page.nextBefore;
  }
  all.sort((a, b) => Number(b.id) - Number(a.id));
  return all;
}

export async function getPostById(id: string): Promise<TgPost | null> {
  const all = await fetchAllPosts();
  return all.find((p) => p.id === id) ?? null;
}
