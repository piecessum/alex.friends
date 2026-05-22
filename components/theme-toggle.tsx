"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === "dark" : true;

  return (
    <button
      type="button"
      aria-label="Переключить тему"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white/60 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/60 transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ y: -10, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 10, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            <Moon className="h-4 w-4 text-neutral-200" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ y: -10, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 10, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            <Sun className="h-4 w-4 text-neutral-700" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
