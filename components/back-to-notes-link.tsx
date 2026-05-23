"use client";

import Link from "next/link";

/**
 * Ссылка «назад к списку лонгридов». Помечает, что при открытии /notes нужно
 * восстановить прежнюю позицию скролла (см. NotesScrollKeeper).
 */
export function BackToNotesLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href="/notes"
      className={className}
      onClick={() => {
        try {
          sessionStorage.setItem("notesRestore", "1");
        } catch {}
      }}
    >
      {children}
    </Link>
  );
}
