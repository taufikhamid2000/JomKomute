"use client";

import { useMemo } from "react";
import { useDictionary } from "@/lib/use-dictionary";

// WCAG relative luminance / contrast ratio — computed client-side for an
// instant preview warning instead of a build-time lint.
function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [rl, gl, bl] = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// Purely controlled — no state of its own. The parent (AppearanceForm)
// owns the bg/fg state and the actual Save action, this just renders the
// two color inputs and a live contrast warning.
export function CustomAccentPicker({
  bg,
  fg,
  onBgChange,
  onFgChange,
}: {
  bg: string;
  fg: string;
  onBgChange: (value: string) => void;
  onFgChange: (value: string) => void;
}) {
  const { t } = useDictionary();
  const ratio = useMemo(() => contrastRatio(bg, fg), [bg, fg]);
  const lowContrast = ratio < 4.5;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-medium text-foreground/70">{t.settings.accentCustom}</span>
        <label className="flex items-center gap-2 text-xs text-foreground/60">
          {t.settings.accentCustomBg}
          <input
            type="color"
            value={bg}
            onChange={(e) => onBgChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground/60">
          {t.settings.accentCustomFg}
          <input
            type="color"
            value={fg}
            onChange={(e) => onFgChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
          />
        </label>
      </div>
      {lowContrast && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{t.settings.accentCustomLowContrast}</p>
      )}
    </div>
  );
}
