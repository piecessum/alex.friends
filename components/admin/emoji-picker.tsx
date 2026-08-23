"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";

export type TelegramEmojiEntry = { id: string; fallback: string; label: string };

// Обычные юникод-эмодзи (😀🔥❤️) можно вставлять системным пикером macOS
// (Cmd+Ctrl+Space) прямо в текст — это просто текст, отдельная кнопка не
// нужна. Эта кнопка — только для КАСТОМНЫХ эмодзи/премиум-стикеров Telegram
// (у которых есть свой числовой id) из твоих наборов — см.
// content/telegram-emoji-set.json (собран через Bot API getStickerSet по
// названиям паков, встреченных в истории канала).
export function EmojiPicker({
  editor,
  emojiSet,
}: {
  editor: Editor;
  emojiSet: TelegramEmojiEntry[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [localSet, setLocalSet] = React.useState(emojiSet);
  const [packInput, setPackInput] = React.useState("");
  const [packStatus, setPackStatus] = React.useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; added: number }
  >({ kind: "idle" });
  const ref = React.useRef<HTMLDivElement>(null);

  async function addPack() {
    if (!packInput.trim()) return;
    setPackStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/admin/emoji-packs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: packInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось добавить набор");
      setLocalSet(data.emojiSet);
      setPackStatus({ kind: "done", added: data.added });
      setPackInput("");
    } catch (e) {
      setPackStatus({ kind: "error", message: (e as Error).message });
    }
  }

  React.useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const groups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? localSet.filter((e) => e.label.toLowerCase().includes(q) || e.fallback.includes(q))
      : localSet;
    const byLabel = new Map<string, TelegramEmojiEntry[]>();
    for (const e of filtered) {
      if (!byLabel.has(e.label)) byLabel.set(e.label, []);
      byLabel.get(e.label)!.push(e);
    }
    return [...byLabel.entries()];
  }, [localSet, query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Эмодзи из твоих Telegram-наборов (обычные — через Cmd+Ctrl+Space)"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Эмодзи Telegram
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-96 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-[#181818]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию набора…"
            autoFocus
            className="mb-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {groups.length === 0 && (
              <p className="py-4 text-center text-sm text-neutral-400">Ничего не нашлось</p>
            )}
            {groups.map(([label, items]) => (
              <div key={label}>
                <p className="mb-1 truncate text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  {label}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {items.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      title={e.fallback}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        editor.chain().focus().insertTelegramEmoji({ id: e.id, fallback: e.fallback }).run();
                        setOpen(false);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/tg-emoji/${e.id}`}
                        alt={e.fallback}
                        loading="lazy"
                        className="h-6 w-6"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <p className="mb-1.5 text-[11px] text-neutral-400">
              Добавить свой набор — вставь ссылку на него (t.me/addemoji/…) или имя
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={packInput}
                onChange={(e) => setPackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPack();
                  }
                }}
                placeholder="t.me/addemoji/MyPack"
                className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={addPack}
                disabled={packStatus.kind === "loading"}
                className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {packStatus.kind === "loading" ? "…" : "Добавить"}
              </button>
            </div>
            {packStatus.kind === "error" && (
              <p className="mt-1.5 text-xs text-red-500">{packStatus.message}</p>
            )}
            {packStatus.kind === "done" && (
              <p className="mt-1.5 text-xs text-green-600 dark:text-green-400">
                Добавлено {packStatus.added} новых эмодзи
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
