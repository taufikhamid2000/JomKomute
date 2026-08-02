"use client";

import { useEffect, useState } from "react";
import { applyTheme, isTheme, THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme";

const THEME_LABEL: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("system");
  // Avoids a hydration mismatch: server-rendered HTML has no localStorage
  // to read, so the real value only exists after mount.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    setTheme(isTheme(stored) ? stored : "system");
    setMounted(true);
  }, []);

  function selectTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
    if (next === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground/60">Theme</h2>
      <div className="flex gap-2">
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => selectTheme(t)}
            aria-pressed={mounted && theme === t}
            className={
              mounted && theme === t
                ? "cursor-pointer rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                : "cursor-pointer rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            }
          >
            {THEME_LABEL[t]}
          </button>
        ))}
      </div>
    </section>
  );
}
