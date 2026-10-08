import { SegmentTabs } from "@/components/segment-tabs";

/** «для себя / для работы» рядом с заголовком «Пишу» (/notes и /notes/work). */
export function NotesTabs({
  active,
  counts,
}: {
  active: "self" | "work";
  counts: { self: number; work: number };
}) {
  return (
    <SegmentTabs
      active={active}
      tabs={[
        { key: "self", label: "для себя", href: "/notes", count: counts.self },
        { key: "work", label: "для работы", href: "/notes/work", count: counts.work },
      ]}
    />
  );
}
