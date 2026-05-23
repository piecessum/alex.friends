"use client";

import { useEffect, useLayoutEffect } from "react";

// useLayoutEffect — чтобы вернуть скролл до отрисовки (без мигания).
// На сервере подменяем на useEffect, иначе React ругается.
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const KEY = "notesScroll"; // последняя позиция скролла на /notes
const FLAG = "notesRestore"; // выставляется кнопкой «назад» в статье

/**
 * Запоминает позицию скролла на странице списка лонгридов и восстанавливает её,
 * когда пользователь возвращается из статьи (по аналогии с кнопкой «назад»).
 */
export function NotesScrollKeeper() {
  useIso(() => {
    try {
      if (sessionStorage.getItem(FLAG) === "1") {
        sessionStorage.removeItem(FLAG);
        const y = Number(sessionStorage.getItem(KEY) || 0);
        if (y) window.scrollTo(0, y);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        try {
          sessionStorage.setItem(KEY, String(window.scrollY));
        } catch {}
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
