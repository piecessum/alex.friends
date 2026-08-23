"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";

export type TelegramEmojiEntry = { id: string; fallback: string; label: string };

export function EmojiPicker({
  editor,
  emojiSet,
}: {
  editor: Editor;
  emojiSet: TelegramEmojiEntry[];
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  if (emojiSet.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Кастомный эмодзи"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        😊+
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 grid grid-cols-6 gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-[#181818]">
          {emojiSet.map((e) => (
            <button
              key={e.id}
              type="button"
              title={e.label}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                editor.chain().focus().insertTelegramEmoji({ id: e.id, fallback: e.fallback }).run();
                setOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/tg-emoji/${e.id}`} alt={e.fallback} className="h-6 w-6" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
