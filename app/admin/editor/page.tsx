import fs from "node:fs";
import path from "node:path";
import { PostEditor } from "@/components/admin/post-editor";
import type { TelegramEmojiEntry } from "@/components/admin/emoji-picker";

export const metadata = { title: "Новый пост — админка" };

function loadEmojiSet(): TelegramEmojiEntry[] {
  try {
    const file = path.join(process.cwd(), "content", "telegram-emoji-set.json");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function AdminEditorPage() {
  const emojiSet = loadEmojiSet();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-semibold">Новый пост</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Публикация уходит в Telegram-канал и на сайт одновременно.
      </p>
      <div className="mt-6">
        <PostEditor emojiSet={emojiSet} />
      </div>
    </main>
  );
}
