"use client";

import { useEffect, useState } from "react";
import {
  ACCENT_CUSTOM_BG_STORAGE_KEY,
  ACCENT_CUSTOM_DEFAULT_BG,
  ACCENT_CUSTOM_DEFAULT_FG,
  ACCENT_CUSTOM_FG_STORAGE_KEY,
  ACCENT_STORAGE_KEY,
  ACCENTS,
  isAccent,
  isHexColor,
  type AccentId,
} from "@/lib/accent";
import { CustomAccentPicker } from "@/components/custom-accent-picker";
import { isTheme, THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme";

const THEME_LABEL: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const ACCENT_LABEL: Record<AccentId, string> = {
  default: "Default",
  ocean: "Ocean",
  forest: "Forest",
  plum: "Plum",
  slate: "Slate",
  custom: "Custom",
};

// Every click only updates local state and applies it instantly to <html>
// as a preview — nothing is persisted to localStorage until Save, so a
// pick you don't like just reverts on next reload if you never save it.
function applyPreview(theme: Theme, accent: AccentId, customBg: string, customFg: string) {
  const html = document.documentElement;
  if (theme === "system") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", theme);
  }
  if (accent === "default") {
    html.removeAttribute("data-accent");
  } else {
    html.setAttribute("data-accent", accent);
  }
  if (accent === "custom") {
    html.style.setProperty("--nav-bg", customBg);
    html.style.setProperty("--nav-fg", customFg);
  } else {
    html.style.removeProperty("--nav-bg");
    html.style.removeProperty("--nav-fg");
  }
}

function readStored() {
  return {
    theme: (() => {
      const v = localStorage.getItem(THEME_STORAGE_KEY);
      return isTheme(v) ? v : ("system" as Theme);
    })(),
    accent: (() => {
      const v = localStorage.getItem(ACCENT_STORAGE_KEY);
      return isAccent(v) ? v : ("default" as AccentId);
    })(),
    customBg: (() => {
      const v = localStorage.getItem(ACCENT_CUSTOM_BG_STORAGE_KEY);
      return isHexColor(v) ? v : ACCENT_CUSTOM_DEFAULT_BG;
    })(),
    customFg: (() => {
      const v = localStorage.getItem(ACCENT_CUSTOM_FG_STORAGE_KEY);
      return isHexColor(v) ? v : ACCENT_CUSTOM_DEFAULT_FG;
    })(),
  };
}

export function AppearanceForm() {
  // Server-rendered HTML has no localStorage to read, so the real saved
  // values only exist after mount — until then, treat nothing as dirty.
  const [mounted, setMounted] = useState(false);

  const [savedTheme, setSavedTheme] = useState<Theme>("system");
  const [savedAccent, setSavedAccent] = useState<AccentId>("default");
  const [savedCustomBg, setSavedCustomBg] = useState(ACCENT_CUSTOM_DEFAULT_BG);
  const [savedCustomFg, setSavedCustomFg] = useState(ACCENT_CUSTOM_DEFAULT_FG);

  const [theme, setThemeLocal] = useState<Theme>("system");
  const [accent, setAccentLocal] = useState<AccentId>("default");
  const [customBg, setCustomBg] = useState(ACCENT_CUSTOM_DEFAULT_BG);
  const [customFg, setCustomFg] = useState(ACCENT_CUSTOM_DEFAULT_FG);

  useEffect(() => {
    const stored = readStored();
    setSavedTheme(stored.theme);
    setSavedAccent(stored.accent);
    setSavedCustomBg(stored.customBg);
    setSavedCustomFg(stored.customFg);
    setThemeLocal(stored.theme);
    setAccentLocal(stored.accent);
    setCustomBg(stored.customBg);
    setCustomFg(stored.customFg);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyPreview(theme, accent, customBg, customFg);
  }, [mounted, theme, accent, customBg, customFg]);

  const dirty =
    mounted &&
    (theme !== savedTheme ||
      accent !== savedAccent ||
      (accent === "custom" && (customBg !== savedCustomBg || customFg !== savedCustomFg)));

  function handleSave() {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (accent === "default") {
      localStorage.removeItem(ACCENT_STORAGE_KEY);
    } else {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    }
    if (accent === "custom") {
      localStorage.setItem(ACCENT_CUSTOM_BG_STORAGE_KEY, customBg);
      localStorage.setItem(ACCENT_CUSTOM_FG_STORAGE_KEY, customFg);
    }
    setSavedTheme(theme);
    setSavedAccent(accent);
    setSavedCustomBg(customBg);
    setSavedCustomFg(customFg);
  }

  function handleDiscard() {
    setThemeLocal(savedTheme);
    setAccentLocal(savedAccent);
    setCustomBg(savedCustomBg);
    setCustomFg(savedCustomFg);
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/60">Theme</h2>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setThemeLocal(t)}
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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/60">Header &amp; sidebar color</h2>
        <div className="flex flex-wrap items-center gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccentLocal(a.id)}
              aria-pressed={mounted && accent === a.id}
              title={ACCENT_LABEL[a.id]}
              style={{ background: a.swatch }}
              className={
                mounted && accent === a.id
                  ? "h-8 w-8 cursor-pointer rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background transition-transform active:scale-95"
                  : "h-8 w-8 cursor-pointer rounded-full border border-border transition-transform hover:scale-105 active:scale-95"
              }
            >
              <span className="sr-only">{ACCENT_LABEL[a.id]}</span>
            </button>
          ))}
        </div>

        {accent === "custom" && (
          <CustomAccentPicker bg={customBg} fg={customFg} onBgChange={setCustomBg} onFgChange={setCustomFg} />
        )}
      </section>

      {dirty && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
          <p className="flex-1 text-xs text-foreground/60">You have unsaved appearance changes.</p>
          <button
            type="button"
            onClick={handleDiscard}
            className="cursor-pointer rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="cursor-pointer rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Save
          </button>
        </div>
      )}
    </>
  );
}
