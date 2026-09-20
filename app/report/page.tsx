"use client";

// Browse-and-vote map for user reports. Creating a new report no longer
// happens here — that's components/report-modal.tsx, opened from the home
// screen's floating report button (app/page.tsx), since reports are
// already GPS-gated to "near the reporter's own position" anyway, which
// made a separate "tap the map to place a pin" step redundant. This page
// now just shows existing report clusters and lets people vote on whether
// they're still happening (see components/report-map.tsx), plus draws the
// active route's corridor as a visual guide when reached with route
// context via ?legs= (still passed through from the home screen's "View
// all reports" link). See supabase/migrations/
// 20260919120000_jomkomute_user_reports.sql for the table + RLS this
// relies on, and that file's header for the "prototype, not hardened"
// caveats (anonymous, unmoderated, spoofable by design for now).

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { useDictionary } from "@/lib/use-dictionary";
import { reportCategoryMeta } from "@/lib/report-categories";
import { routeCorridorPoints, type CorridorPoint } from "@/lib/route-corridor";
import { getRecentUserReports, type UserReport } from "@/lib/user-reports-client";
import type { RouteLeg } from "@/lib/types";

// react-leaflet reaches for `window` at import time, which breaks
// `next build`'s prerendering pass — ssr: false keeps it out of that pass
// entirely, same as any other browser-only widget here.
const ReportMap = dynamic(() => import("@/components/report-map").then((m) => m.ReportMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-foreground/40">Loading map…</div>
  ),
});

// Wraps the actual page in Suspense — useSearchParams() (below, for the
// ?legs= route context the home screen's "View all reports" link passes)
// requires it, same as app/route/page.tsx's ?id= reader.
export default function ReportPage() {
  return (
    <Shell>
      <Suspense fallback={null}>
        <ReportPageContent />
      </Suspense>
    </Shell>
  );
}

function ReportPageContent() {
  const { t } = useDictionary();
  const categories = reportCategoryMeta(t.reportPage.categories);

  // Route context from the home screen — the legs of whichever route was
  // active there, drawn as a visual guide only now (no corridor gate left
  // on this page, since reports are created elsewhere). No ?legs? (direct
  // navigation, or no active route on the home screen) just shows the
  // plain map.
  const legsParam = useSearchParams().get("legs");
  const corridor = useMemo<CorridorPoint[]>(() => {
    if (!legsParam) return [];
    try {
      const legs = JSON.parse(legsParam) as RouteLeg[];
      return routeCorridorPoints(legs);
    } catch {
      return [];
    }
  }, [legsParam]);

  const [reports, setReports] = useState<UserReport[]>([]);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(() => {
    getRecentUserReports()
      .then((rows) => {
        setReports(rows);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="animate-page-in flex w-full flex-1 flex-col gap-4 p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">{t.reportPage.title}</h1>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
            style={{ backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
          >
            {t.reportPage.conceptBadge}
          </span>
        </div>
        <p className="max-w-lg text-sm text-foreground/60">{t.reportPage.description}</p>
        {loadError ? <p className="text-sm text-[var(--destructive)]">{t.reportPage.loadError}</p> : null}
      </div>

      <div className="relative mx-auto h-[60vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border">
        <ReportMap reports={reports} categories={categories} onVoted={refresh} corridor={corridor} t={t.reportPage} />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-wrap gap-3 text-xs text-foreground/50">
        {categories.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: c.color, color: "white" }}>
              <span className="scale-[0.6]">{c.icon}</span>
            </span>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
