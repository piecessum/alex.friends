import { ResearchCard } from "@/components/research-card";
import { ResearchStories, type StoryWeek } from "@/components/research-stories";
import { getAllDigests, getAllResearch, TOPIC_COLORS, TOPICS, type Research } from "@/lib/research";

export const metadata = {
  title: "Исследования — Алексей Масюта",
};

/** 1 статья, 2 статьи, 5 статей. */
function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export default function ResearchPage() {
  const items = getAllResearch();
  const bySlug = new Map<string, Research>(items.map((r) => [r.slug, r]));

  // Дайджесты недели — историями: слайд недели и по слайду на исследование.
  const weeks: StoryWeek[] = getAllDigests().map((d) => {
    const research = d.items.flatMap((it) => {
      const r = bySlug.get(it.slug);
      return r ? [{ r, takeaway: it.takeaway }] : [];
    });
    return {
      slug: d.slug,
      label: d.title.includes(":") ? d.title.split(":").pop()!.trim() : d.title,
      preview: d.cover ?? research[0]?.r.cover,
      slides: [
        {
          kicker: `Дайджест недели · ${research.length} ${plural(research.length, "статья", "статьи", "статей")}`,
          title: d.title,
          text: d.intro.replace(/\*\*|\*|\[([^\]]+)\]\([^)]+\)/g, "$1"),
          image: d.cover,
          background: "#3a3440",
          href: `/research/week/${d.slug}`,
          cta: "Все исследования недели",
        },
        ...research.map(({ r, takeaway }) => ({
          kicker: `${TOPICS[r.topic]} · ${r.readingMinutes} мин`,
          title: r.title,
          text: takeaway,
          image: r.cover,
          background: TOPIC_COLORS[r.topic],
          href: `/research/${r.slug}`,
          cta: "Читать статью",
        })),
      ],
    };
  });

  return (
    <main className="w-full flex-1 px-page py-12 sm:py-16">
      <h1 className="text-h1 font-bold tracking-tight">Исследования</h1>
      <p className="mt-3 max-w-[40em] text-body text-neutral-600 dark:text-neutral-400">
        По будням — небольшой обзор интересного исследования, по субботам —
        дайджест недели. Чтобы читать
        большие исследования, нужно выделить время, а ещё их надо найти. Тут
        всё собрано в кратком формате, а если очень понравится — в конце есть
        ссылка на оригинальную статью.
      </p>

      {weeks.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-body text-neutral-600 dark:text-neutral-400">Недельные дайджесты:</div>
          <ResearchStories weeks={weeks} />
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-12 text-center text-ui text-neutral-500 dark:text-neutral-400">
          Здесь пока пусто.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((r, i) => (
            <ResearchCard key={r.slug} r={r} eager={i < 4} />
          ))}
        </div>
      )}
    </main>
  );
}
