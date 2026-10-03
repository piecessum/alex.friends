"use client";

import { useState } from "react";
import { FitImage } from "@/components/fit-image";
import { Lightbox } from "@/components/lightbox";
import { SpoilerHtml } from "@/components/spoiler-html";
import type { TgRichBlock } from "@/lib/telegram";

/**
 * Пост в новой вёрстке Telegram: текст, посреди него картинки, под картинкой —
 * подпись (как в самом Telegram). Размеры картинок известны заранее (см.
 * scripts/sync-channel.ts), поэтому вёрстка не прыгает при загрузке.
 * Все фото поста открываются в одном лайтбоксе с листанием.
 */
export function RichPostBody({
  blocks,
  textClassName,
}: {
  blocks: TgRichBlock[];
  textClassName: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const photos = blocks.flatMap((b) => (b.type === "photo" ? [b.src] : []));
  let photoNo = 0;

  return (
    <div className="mt-5 space-y-5">
      {blocks.map((b, i) => {
        if (b.type === "text") {
          return <SpoilerHtml key={i} className={textClassName} html={b.html} />;
        }
        const n = photoNo++;
        return (
          <figure key={i}>
            <FitImage
              src={b.src}
              width={b.width}
              height={b.height}
              eager={n === 0}
              onClick={() => setIndex(n)}
              className="mx-auto h-auto cursor-zoom-in rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60"
            />
            {b.caption && (
              <figcaption
                className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400"
                dangerouslySetInnerHTML={{ __html: b.caption }}
              />
            )}
          </figure>
        );
      })}

      {index !== null && (
        <Lightbox items={photos} startIndex={index} onClose={() => setIndex(null)} />
      )}
    </div>
  );
}
