"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Spoiler } from "@/components/admin/tiptap-extensions/spoiler-mark";
import { ExpandableBlockquote } from "@/components/admin/tiptap-extensions/expandable-blockquote";
import { TelegramEmoji } from "@/components/admin/tiptap-extensions/telegram-emoji-node";
import { PostImage } from "@/components/admin/tiptap-extensions/post-image-node";
import { Gallery } from "@/components/admin/tiptap-extensions/gallery-node";
import { EmojiPicker, type TelegramEmojiEntry } from "@/components/admin/emoji-picker";
import { fileToCompressedDataUrl } from "@/components/admin/image-compress";

type TelegramResult = {
  messageId: number;
  url: string;
  photoFileIds?: string[];
};

type PublishStatus =
  | { step: "idle" }
  | { step: "sending" }
  | { step: "committing"; telegramUrl: string }
  | { step: "done"; telegramUrl: string; commitUrl: string }
  // canRetryCommit — Telegram уже принял пост, упал только коммит на сайт:
  // повторный клик должен бить только в /commit, не слать в Telegram ещё раз.
  | { step: "error"; message: string; telegramUrl?: string; canRetryCommit?: boolean };

const DRAFT_KEY = "admin-post-draft";

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-indigo-600 text-white"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

export function PostEditor({
  emojiSet = [],
}: {
  emojiSet?: TelegramEmojiEntry[];
}) {
  const [status, setStatus] = React.useState<PublishStatus>({ step: "idle" });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Пост уже ушёл в Telegram, но коммит на сайт ещё не прошёл — держим здесь,
  // чтобы «Повторить» не долбило Telegram ещё раз (см. commitToSite).
  const pendingCommitRef = React.useRef<TelegramResult | null>(null);
  const restoredDraft = React.useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ blockquote: false }),
      ExpandableBlockquote,
      Spoiler,
      TelegramEmoji,
      PostImage,
      Gallery,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Пиши здесь…" }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none min-h-[240px] focus:outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:rounded-lg [&_pre]:bg-neutral-900 [&_pre]:p-3 [&_pre]:text-sm [&_pre]:text-neutral-100",
      },
    },
    // Черновик — на случай случайно закрытой вкладки (актуально при
    // публикации с телефона). Не восстанавливаем, если уже что-то ушло
    // в Telegram и ждёт коммита — тогда потеря черновика не страшна.
    onUpdate: ({ editor }) => {
      if (pendingCommitRef.current) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ doc: editor.getJSON() }));
      } catch {
        // localStorage недоступен (приватный режим и т.п.) — черновик просто не сохранится
      }
    },
  });

  // Восстановление черновика — один раз, после того как редактор создан.
  React.useEffect(() => {
    if (!editor || restoredDraft.current) return;
    restoredDraft.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { doc?: unknown };
      if (draft.doc) editor.commands.setContent(draft.doc as never);
    } catch {
      // повреждённый черновик — просто игнорируем
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // см. onUpdate — то же самое ограничение
    }
  }

  async function handleImageFiles(files: FileList | null) {
    if (!editor || !files?.length) return;
    const images = await Promise.all(
      Array.from(files).map((f) => fileToCompressedDataUrl(f))
    );
    if (images.length === 1) {
      editor.chain().focus().insertPostImage(images[0]).run();
    } else {
      editor.chain().focus().insertGallery(images).run();
    }
  }

  async function commitToSite(doc: object, telegramResult: TelegramResult) {
    setStatus({ step: "committing", telegramUrl: telegramResult.url });
    pendingCommitRef.current = telegramResult;
    try {
      const res = await fetch("/api/admin/publish/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc, telegramResult }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка коммита на сайт");
      pendingCommitRef.current = null;
      setStatus({
        step: "done",
        telegramUrl: telegramResult.url,
        commitUrl: data.commit.htmlUrl,
      });
      editor?.commands.clearContent();
      clearDraft();
    } catch (e) {
      setStatus({
        step: "error",
        message: (e as Error).message,
        telegramUrl: telegramResult.url,
        canRetryCommit: true,
      });
    }
  }

  async function publish() {
    if (!editor) return;
    const doc = editor.getJSON();

    setStatus({ step: "sending" });
    let telegramResult: TelegramResult;
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки в Telegram");
      telegramResult = data.telegramResult;
    } catch (e) {
      setStatus({ step: "error", message: (e as Error).message });
      return;
    }

    await commitToSite(doc, telegramResult);
  }

  async function retryCommit() {
    if (!editor || !pendingCommitRef.current) return;
    await commitToSite(editor.getJSON(), pendingCommitRef.current);
  }

  if (!editor) return null;

  const busy = status.step === "sending" || status.step === "committing";

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void handleImageFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-[#141414]">
        <ToolbarButton
          title="Жирный"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          title="Курсив"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          title="Подчёркнутый"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <ToolbarButton
          title="Зачёркнутый"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </ToolbarButton>
        <ToolbarButton
          title="Инлайн-код"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          {"</>"}
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
        <ToolbarButton
          title="Заголовок (жирным — у Telegram нет настоящих заголовков)"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H
        </ToolbarButton>
        <ToolbarButton
          title="Спойлер"
          active={editor.isActive("spoiler")}
          onClick={() => editor.chain().focus().toggleSpoiler().run()}
        >
          🙈
        </ToolbarButton>
        <ToolbarButton
          title="Цитата"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          "
        </ToolbarButton>
        <ToolbarButton
          title="Раскрывающаяся цитата (только у выделенной цитаты)"
          active={editor.isActive("blockquote", { expandable: true })}
          onClick={() =>
            editor
              .chain()
              .focus()
              .setBlockquoteExpandable(!editor.isActive("blockquote", { expandable: true }))
              .run()
          }
        >
          ▾"
        </ToolbarButton>
        <ToolbarButton
          title="Блок кода"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"{ }"}
        </ToolbarButton>
        <ToolbarButton
          title="Список"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          title="Ссылка"
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("URL ссылки:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
            else editor.chain().focus().unsetLink().run();
          }}
        >
          🔗
        </ToolbarButton>
        <EmojiPicker editor={editor} emojiSet={emojiSet} />
        <ToolbarButton
          title="Картинка (несколько файлов — галерея)"
          onClick={() => fileInputRef.current?.click()}
        >
          🖼
        </ToolbarButton>
      </div>

      <div className="rounded-b-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-[#181818]">
        <EditorContent editor={editor} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={publish}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? "Публикую…" : "Опубликовать"}
        </button>

        {status.step === "sending" && (
          <span className="text-sm text-neutral-500">Отправляю в Telegram…</span>
        )}
        {status.step === "committing" && (
          <span className="text-sm text-neutral-500">
            Ушло в{" "}
            <a href={status.telegramUrl} target="_blank" rel="noopener noreferrer" className="underline">
              канал
            </a>
            , коммичу на сайт…
          </span>
        )}
        {status.step === "done" && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Готово:{" "}
            <a href={status.telegramUrl} target="_blank" rel="noopener noreferrer" className="underline">
              в Telegram
            </a>{" "}
            ·{" "}
            <a href={status.commitUrl} target="_blank" rel="noopener noreferrer" className="underline">
              коммит
            </a>
          </span>
        )}
        {status.step === "error" && (
          <span className="text-sm text-red-500">
            Ошибка: {status.message}
            {status.telegramUrl && (
              <>
                {" "}
                (в Telegram уже ушло —{" "}
                <a href={status.telegramUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  ссылка
                </a>
                )
              </>
            )}
            {status.canRetryCommit && (
              <button
                type="button"
                onClick={retryCommit}
                className="ml-2 underline decoration-dotted"
              >
                Повторить коммит
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
