"use client";

import { useDictionary } from "@/lib/use-dictionary";

// The core pitch as a picture instead of a paragraph: a dot rides the
// usual route, dips onto the dashed backup line around the disruption
// marker, then rejoins — on a loop. The dip's vertical offset (18px) is
// tied to .animate-commute-loop's keyframes in globals.css; change one,
// change the other.
export function CommuteDiagram() {
  const { t } = useDictionary();

  return (
    <div className="flex flex-col gap-5">
      <div className="relative h-24 w-full px-1">
        <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-[var(--border)]" aria-hidden="true" />

        <div
          className="absolute h-0 border-t-2 border-dashed"
          style={{ left: "32%", right: "32%", top: "calc(50% + 18px)", borderColor: "var(--accent)" }}
          aria-hidden="true"
        />

        <span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: "0%", backgroundColor: "var(--primary)" }}
          aria-hidden="true"
        />
        <span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: "100%", backgroundColor: "var(--primary)" }}
          aria-hidden="true"
        />

        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
          <span
            className="absolute -inset-1.5 animate-ping rounded-full opacity-50"
            style={{ backgroundColor: "var(--destructive)" }}
          />
          <span className="relative block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--destructive)" }} />
        </span>

        <span
          className="animate-commute-loop absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: "var(--primary)", boxShadow: "0 0 0 4px var(--background)" }}
          aria-hidden="true"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-foreground/60">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded-full" style={{ backgroundColor: "var(--primary)" }} aria-hidden="true" />
          {t.about.diagramUsualRoute}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--destructive)" }} aria-hidden="true" />
          {t.about.diagramDisruption}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: "var(--accent)" }}
            aria-hidden="true"
          />
          {t.about.diagramBackupRoute}
        </span>
      </div>
    </div>
  );
}
