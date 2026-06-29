import type { WritingsStats } from "@/lib/writings-stats";

// 12 разных цветов для сегментов pie chart + серый для «без тега».
const PALETTE = [
  "hsl(238 70% 60%)", // indigo
  "hsl(263 70% 60%)", // violet
  "hsl(290 70% 60%)", // fuchsia
  "hsl(330 70% 60%)", // pink
  "hsl(350 75% 62%)", // rose
  "hsl(20 80% 60%)",  // orange
  "hsl(40 88% 55%)",  // amber
  "hsl(160 65% 45%)", // emerald
  "hsl(180 65% 45%)", // teal
  "hsl(200 75% 52%)", // sky
  "hsl(95 50% 50%)",  // lime
  "hsl(15 70% 55%)",  // brick
];
const UNTAGGED_COLOR = "hsl(0 0% 65%)";

function colorFor(i: number): string {
  return PALETTE[i % PALETTE.length];
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-neutral-200 bg-white/50 p-5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/50">
      <div className={`text-[11px] font-semibold uppercase tracking-widest ${accent}`}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Четыре ключевые цифры — отдельно, чтобы разместить столбиком рядом с графом. */
export function StatsTotals({ stats }: { stats: WritingsStats }) {
  const { totals } = stats;
  const pct = (n: number) =>
    totals.posts ? `${Math.round((n / totals.posts) * 100)}% постов` : undefined;
  return (
    <>
      <StatCard label="Всего постов" value={totals.posts} accent="text-indigo-500" />
      <StatCard label="Лонгридов" value={totals.notes} accent="text-fuchsia-500" />
      <StatCard
        label="С медиа"
        value={totals.withMedia}
        hint={pct(totals.withMedia)}
        accent="text-teal-500"
      />
      <StatCard
        label="Репостов"
        value={totals.forwarded}
        hint={pct(totals.forwarded)}
        accent="text-amber-500"
      />
    </>
  );
}

function donutPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  const x1o = cx + rOuter * Math.cos(startAngle);
  const y1o = cy + rOuter * Math.sin(startAngle);
  const x2o = cx + rOuter * Math.cos(endAngle);
  const y2o = cy + rOuter * Math.sin(endAngle);
  const x1i = cx + rInner * Math.cos(endAngle);
  const y1i = cy + rInner * Math.sin(endAngle);
  const x2i = cx + rInner * Math.cos(startAngle);
  const y2i = cy + rInner * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${x1o} ${y1o}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x2i} ${y2i}`,
    "Z",
  ].join(" ");
}

function TagsPie({
  segments,
  totalLabel,
  totalValue,
}: {
  segments: { label: string; count: number; color: string }[];
  totalLabel: string;
  totalValue: number;
}) {
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  let angle = -Math.PI / 2;
  const paths = segments.map((s) => {
    const frac = s.count / total;
    const start = angle;
    const end = angle + frac * Math.PI * 2;
    angle = end;
    return { ...s, frac, d: donutPath(100, 100, 90, 55, start, end) };
  });

  return (
    <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center">
      <div className="relative w-full max-w-[260px] shrink-0">
        <svg viewBox="0 0 200 200" className="h-auto w-full">
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color}>
              <title>{`${p.label}: ${p.count} (${(p.frac * 100).toFixed(1)}%)`}</title>
            </path>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold tracking-tight">{totalValue}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{totalLabel}</div>
        </div>
      </div>

      <ul className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex-1">
        {paths.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: p.color }}
            />
            <span className="flex-1 truncate text-neutral-700 dark:text-neutral-300">
              {p.label}
            </span>
            <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
              {p.count}
            </span>
            <span className="w-12 text-right tabular-nums text-xs text-neutral-400">
              {(p.frac * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function YearBars({
  data,
}: {
  data: { year: number; posts: number; notes: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Данных пока нет.
      </p>
    );
  }
  const W = 600;
  const H = 220;
  const padX = 32;
  const padY = 24;
  const bw = (W - padX * 2) / data.length;
  const max = Math.max(...data.map((d) => d.posts + d.notes), 1);
  const barW = Math.min(48, bw * 0.65);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 36}`} className="h-auto w-full min-w-[420px]">
        {/* сетка */}
        {[0.25, 0.5, 0.75, 1].map((g) => {
          const y = H - padY - (H - padY * 2) * g;
          return (
            <line
              key={g}
              x1={padX}
              x2={W - padX}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          );
        })}

        {data.map((d, i) => {
          const x = padX + bw * i + (bw - barW) / 2;
          const total = d.posts + d.notes;
          const totalH = ((H - padY * 2) * total) / max;
          const postsH = ((H - padY * 2) * d.posts) / max;
          const notesH = ((H - padY * 2) * d.notes) / max;
          const yTop = H - padY - totalH;
          return (
            <g key={d.year}>
              {d.posts > 0 && (
                <rect
                  x={x}
                  y={H - padY - postsH}
                  width={barW}
                  height={postsH}
                  rx={3}
                  fill="hsl(238 70% 60%)"
                >
                  <title>{`${d.year}: ${d.posts} постов`}</title>
                </rect>
              )}
              {d.notes > 0 && (
                <rect
                  x={x}
                  y={H - padY - postsH - notesH}
                  width={barW}
                  height={notesH}
                  rx={3}
                  fill="hsl(290 70% 60%)"
                >
                  <title>{`${d.year}: ${d.notes} лонгридов`}</title>
                </rect>
              )}
              <text
                x={x + barW / 2}
                y={yTop - 6}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                fillOpacity="0.7"
              >
                {total}
              </text>
              <text
                x={padX + bw * i + bw / 2}
                y={H - padY + 14}
                textAnchor="middle"
                fontSize="12"
                fill="currentColor"
                fillOpacity="0.55"
              >
                {d.year}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "hsl(238 70% 60%)" }} />
          посты канала
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "hsl(290 70% 60%)" }} />
          лонгриды
        </span>
      </div>
    </div>
  );
}

function WeekdayBars({ data }: { data: { day: string; count: number }[] }) {
  const W = 420;
  const H = 180;
  const padX = 24;
  const padY = 20;
  const bw = (W - padX * 2) / data.length;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.min(40, bw * 0.7);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="h-auto w-full min-w-[320px]">
        {[0.25, 0.5, 0.75, 1].map((g) => {
          const y = H - padY - (H - padY * 2) * g;
          return (
            <line
              key={g}
              x1={padX}
              x2={W - padX}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          );
        })}
        {data.map((d, i) => {
          const x = padX + bw * i + (bw - barW) / 2;
          const h = ((H - padY * 2) * d.count) / max;
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={H - padY - h}
                width={barW}
                height={h}
                rx={3}
                fill="hsl(180 65% 45%)"
              >
                <title>{`${d.day}: ${d.count} постов`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={H - padY - h - 6}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                fillOpacity="0.7"
              >
                {d.count}
              </text>
              <text
                x={padX + bw * i + bw / 2}
                y={H - padY + 14}
                textAnchor="middle"
                fontSize="12"
                fill="currentColor"
                fillOpacity="0.55"
              >
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white/50 p-6 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/50">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {hint && (
          <span className="text-xs text-neutral-500 dark:text-neutral-500">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

export function StatsDashboard({ stats }: { stats: WritingsStats }) {
  const { totals, byTag, byYear, byWeekday, facts } = stats;

  const pieSegments = [
    ...byTag.map((t, i) => ({
      label: `#${t.tag}`,
      count: t.count,
      color: colorFor(i),
    })),
    ...(totals.untaggedPosts > 0
      ? [{ label: "без тега", count: totals.untaggedPosts, color: UNTAGGED_COLOR }]
      : []),
  ];

  return (
    <div className="space-y-8">
      <Section title="Темы постов" hint={`${byTag.length} категорий`}>
        <TagsPie
          segments={pieSegments}
          totalLabel="постов"
          totalValue={totals.posts}
        />
      </Section>

      <Section title="Публикации по годам">
        <YearBars data={byYear} />
      </Section>

      <Section title="Когда я пишу" hint="по дням недели">
        <WeekdayBars data={byWeekday} />
      </Section>

      <Section title="Интересные факты">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {facts.firstDate && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Период активности
              </dt>
              <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {facts.firstDate} — {facts.lastDate}
              </dd>
            </div>
          )}
          {facts.avgPostsPerMonth > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                В среднем
              </dt>
              <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {facts.avgPostsPerMonth.toFixed(1)} постов в месяц
              </dd>
            </div>
          )}
          {facts.busiestMonth && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Самый продуктивный месяц
              </dt>
              <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {facts.busiestMonth.label} — {facts.busiestMonth.count} постов
              </dd>
            </div>
          )}
          {facts.avgPostLength > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Длина поста
              </dt>
              <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                ~{facts.avgPostLength} символов в среднем
              </dd>
            </div>
          )}
          {facts.longestPost && facts.longestPost.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Самый длинный пост
              </dt>
              <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                <a
                  href={`/channel/${facts.longestPost.id}`}
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {facts.longestPost.length} символов
                </a>{" "}
                — {facts.longestPost.preview}…
              </dd>
            </div>
          )}
        </dl>
      </Section>
    </div>
  );
}
