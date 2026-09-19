"use client";

import { useDictionary } from "@/lib/use-dictionary";

// The live-reporting pitch as a picture: three report pins appear one at
// a time along a map line, pulse, then fade — as if different riders are
// dropping reports and everyone else sees them show up. Same restrained
// visual language as CommuteDiagram (small circles, animate-ping rings,
// a thin base line), staggered with the .animate-report-pin keyframe
// defined in globals.css (each pin gets a 3s animation-delay so only
// one is "live" on the line at a time across the shared 9s loop).
const PINS = [
  { color: "#d97706", left: "18%", delay: "0s" },
  { color: "#dc2626", left: "50%", delay: "3s" },
  { color: "#2563eb", left: "82%", delay: "6s" },
] as const;

export function LiveReportsDiagram() {
  const { t } = useDictionary();

  const labels = [t.reportPage.categories.delay, t.reportPage.categories.accident, t.reportPage.categories.crowded];

  return (
    <div className="flex flex-col gap-5">
      <div className="relative h-24 w-full px-1">
        <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-[var(--border)]" aria-hidden="true" />

        {PINS.map((pin, i) => (
          <span
            key={pin.left}
            className="animate-report-pin absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pin.left, animationDelay: pin.delay }}
            aria-hidden="true"
          >
            <span className="absolute -inset-1.5 animate-ping rounded-full opacity-50" style={{ backgroundColor: pin.color }} />
            <span
              className="relative block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: pin.color, boxShadow: "0 0 0 3px var(--background)" }}
            />
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-foreground/60">
        {PINS.map((pin, i) => (
          <span key={pin.left} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pin.color }} aria-hidden="true" />
            {labels[i]}
          </span>
        ))}
      </div>
    </div>
  );
}
