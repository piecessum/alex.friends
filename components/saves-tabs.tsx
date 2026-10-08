import { SegmentTabs } from "@/components/segment-tabs";
import { getPins } from "@/lib/pinterest";
import { getPhotos } from "@/lib/photos";

/** «Пины / Фоткаю» рядом с заголовком «Сохранёнки» (/pins и /photos). */
export function SavesTabs({ active }: { active: "pins" | "photos" }) {
  return (
    <SegmentTabs
      active={active}
      tabs={[
        { key: "pins", label: "Пины", href: "/pins", count: getPins().length },
        { key: "photos", label: "Фоткаю", href: "/photos", count: getPhotos().length },
      ]}
    />
  );
}
