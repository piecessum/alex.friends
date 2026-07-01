import type { NoteIndexItem } from "./notes";
import type { TgPost } from "./telegram";
import { postBody } from "./post-text";

// ─────────────────────────────────────────────────────────────────────────────
// Граф «посты ⟷ теги» в духе Obsidian: узлы-теги — хабы, узлы-посты висят на
// своих тегах. У части постов (пересланные, медиа-посты) явного хэштега нет —
// им подбираем ближайший тег по тексту (мягкий тег) тем же TF/cosine-движком,
// что и «Читать ещё». Мягкие связи помечаем `soft`, чтобы рисовать их иначе и
// не выдавать догадку за авторский тег.
// ─────────────────────────────────────────────────────────────────────────────

export type GraphNodeKind = "tag" | "post" | "note";

export type GraphNode = {
  id: string; // "tag:мысль" | "post:123" | "note:slug"
  kind: GraphNodeKind;
  label: string; // имя тега / превью поста / заголовок лонгрида
  href?: string; // куда вести по клику (для постов и лонгридов)
  tag?: string; // тег-узел: имя; пост-узел: ведущий тег (для цвета)
  count?: number; // тег-узел: сколько материалов на нём висит
  soft?: boolean; // пост-узел: тег подобран по смыслу, а не указан явно
  focus?: boolean; // локальный граф: узел текущего поста (подсвечивается)
};

export type GraphLink = {
  source: string;
  target: string; // всегда id тег-узла
  soft?: boolean;
};

export type TagGraph = { nodes: GraphNode[]; links: GraphLink[] };

// Тег попадает в «мишени» для мягкой классификации только если у него
// достаточно явных примеров — иначе центроид шумный и тянет наугад.
const MIN_TAG_EXAMPLES = 3;
// Порог близости: ниже — считаем, что пост ни на что не похож, не тегируем.
const SOFT_THRESHOLD = 0.03;

const STOPWORDS = new Set([
  "это", "как", "что", "для", "при", "его", "она", "они", "был", "было",
  "были", "быть", "есть", "или", "под", "над", "без", "про", "том", "так",
  "все", "всё", "ещё", "уже", "себя", "свой", "своё", "свои", "этот", "эта",
  "эти", "тот", "там", "тут", "вот", "если", "чтобы", "когда", "очень",
  "можно", "нужно", "тоже", "также", "более", "менее", "просто", "потом",
  "после", "перед", "между", "через", "будет", "будут", "может", "меня",
  "тебя", "него", "неё", "них", "сам", "сама", "сами", "который", "которые",
  "которая", "которое", "этого", "этом", "than", "this", "that", "with",
  "from", "have", "they",
]);

type Vec = Map<string, number>;

function tokenize(text: string): string[] {
  return (text.toLowerCase().replace(/ё/g, "е").match(/[a-zа-я]{4,}/g) || [])
    .filter((w) => !STOPWORDS.has(w));
}

function addTokens(vec: Vec, text: string): void {
  for (const t of tokenize(text)) vec.set(t, (vec.get(t) || 0) + 1);
}

function cosine(a: Vec, b: Vec): number {
  let dot = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, v] of small) dot += v * (big.get(t) || 0);
  if (!dot) return 0;
  const norm = (v: Vec) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  return dot / (norm(a) * norm(b) || 1);
}

/** Текст поста без html и без хэштегов — основа для классификации. */
function postText(p: TgPost): string {
  return postBody(p)
    .replace(/<[^>]+>/g, " ")
    .replace(/#[\p{L}\p{N}_]+/giu, " ")
    .replace(/&nbsp;/g, " ");
}

function excerpt(text: string, len: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  return s.length <= len ? s : s.slice(0, len).trimEnd() + "…";
}

type Item = {
  id: string;
  kind: "post" | "note";
  label: string;
  href: string;
  text: string;
  tags: string[];
  soft: boolean;
};

export function buildTagGraph(
  posts: TgPost[],
  notes: NoteIndexItem[],
  opts: { soft?: boolean } = {}
): TagGraph {
  const useSoft = opts.soft ?? true;

  const items: Item[] = [];
  for (const p of posts) {
    const text = postText(p);
    items.push({
      id: `post:${p.id}`,
      kind: "post",
      label: excerpt(text, 60) || "(без текста)",
      href: `/channel/${p.id}`,
      text,
      tags: [...new Set(p.tags)],
      soft: false,
    });
  }
  for (const n of notes) {
    items.push({
      id: `note:${n.slug}`,
      kind: "note",
      label: n.title,
      href: `/notes/${n.slug}`,
      text: `${n.title} ${n.excerpt}`,
      tags: [...new Set(n.tags ?? [])],
      soft: false,
    });
  }

  // ── Центроиды тегов из явно тегированных материалов ──────────────────────
  const centroids = new Map<string, Vec>();
  const tagExamples = new Map<string, number>();
  for (const it of items) {
    for (const t of it.tags) {
      tagExamples.set(t, (tagExamples.get(t) || 0) + 1);
      let c = centroids.get(t);
      if (!c) centroids.set(t, (c = new Map()));
      addTokens(c, it.text);
    }
  }
  const targets = [...centroids.entries()].filter(
    ([t]) => (tagExamples.get(t) || 0) >= MIN_TAG_EXAMPLES
  );

  // ── Мягкая классификация: безтеговым подбираем ближайший тег по тексту ────
  if (useSoft) {
    for (const it of items) {
      if (it.tags.length) continue;
      const v: Vec = new Map();
      addTokens(v, it.text);
      if (v.size === 0) continue;
      let best = "";
      let bestScore = 0;
      for (const [t, c] of targets) {
        const s = cosine(v, c);
        if (s > bestScore) {
          bestScore = s;
          best = t;
        }
      }
      if (best && bestScore > SOFT_THRESHOLD) {
        it.tags = [best];
        it.soft = true;
      }
    }
  }

  // ── Узлы и связи: только материалы, у которых в итоге есть тег ────────────
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const tagCount = new Map<string, number>();

  for (const it of items) {
    if (it.tags.length === 0) continue;
    nodes.push({
      id: it.id,
      kind: it.kind,
      label: it.label,
      href: it.href,
      tag: it.tags[0],
      soft: it.soft,
    });
    for (const t of it.tags) {
      tagCount.set(t, (tagCount.get(t) || 0) + 1);
      links.push({ source: it.id, target: `tag:${t}`, soft: it.soft });
    }
  }
  for (const [t, count] of tagCount) {
    nodes.push({ id: `tag:${t}`, kind: "tag", label: t, tag: t, count });
  }

  return { nodes, links };
}

/**
 * Локальный граф вокруг одного материала (как Local Graph в Obsidian):
 * сам узел (помечен `focus`), его теги и до `perTag` соседей по каждому тегу.
 * `focusId` — id узла из общего графа, например `post:123` или `note:slug`.
 */
export function buildLocalGraph(
  posts: TgPost[],
  notes: NoteIndexItem[],
  focusId: string,
  opts: { perTag?: number } = {}
): TagGraph {
  const perTag = opts.perTag ?? 12;
  const full = buildTagGraph(posts, notes, { soft: true });
  const byId = new Map(full.nodes.map((n) => [n.id, n]));

  // тег → id материалов на нём
  const members = new Map<string, string[]>();
  for (const l of full.links) {
    (members.get(l.target) ?? members.set(l.target, []).get(l.target)!).push(l.source);
  }
  // теги фокус-узла (с пометкой soft у его собственной связи)
  const focusLinks = full.links.filter((l) => l.source === focusId);

  const picked = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const add = (id: string, extra?: Partial<GraphNode>) => {
    const base = byId.get(id);
    if (base) picked.set(id, { ...base, ...extra });
  };

  const focus = byId.get(focusId);
  if (focus) {
    picked.set(focusId, { ...focus, focus: true });
  } else {
    // Материал без тега (не классифицировался) — показываем одинокий узел.
    picked.set(focusId, {
      id: focusId,
      kind: focusId.startsWith("note:") ? "note" : "post",
      label: "этот пост",
      focus: true,
    });
  }

  for (const fl of focusLinks) {
    const tagId = fl.target;
    add(tagId);
    links.push({ source: focusId, target: tagId, soft: fl.soft });
    const sibs = (members.get(tagId) ?? [])
      .filter((s) => s !== focusId)
      // явные теги перед мягкими, чтобы соседи были «крепче»
      .sort((a, b) => Number(byId.get(a)?.soft) - Number(byId.get(b)?.soft));
    for (const s of sibs.slice(0, perTag)) {
      add(s);
      links.push({ source: s, target: tagId, soft: byId.get(s)?.soft });
    }
  }

  return { nodes: [...picked.values()], links };
}
