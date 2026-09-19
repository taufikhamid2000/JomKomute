"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChangePlanModal } from "@/components/change-plan-modal";
import { EmptyState } from "@/components/empty-state";
import { Shell } from "@/components/shell";
import { mockCrowdFor, type CrowdMock } from "@/lib/crowd-mock";
import { lineById } from "@/lib/lines";
import { computeNextRoute, type NextRoute } from "@/lib/next-route";
import { getPingCounts, putPing } from "@/lib/pings-client";
import { useAllExceptions, useSavedRoutes } from "@/lib/store";
import type { SavedRoute } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";

// react-leaflet touches window/document at module load — dynamic-import
// with ssr:false so next.config.ts's static export (prerendered with no
// browser present) doesn't break on this route (same pattern as
// app/report/page.tsx's ReportMap).
const RouteMap = dynamic(() => import("@/components/route-map").then((m) => m.RouteMap), { ssr: false });

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function DashboardPage() {
  const { t } = useDictionary();
  const { routes } = useSavedRoutes();
  const exceptions = useAllExceptions();
  const [modalOpen, setModalOpen] = useState(false);

  const homeRoute = routes.find((r) => r.isHome);

  // Re-evaluated on every render rather than memoized against a ticking
  // clock — good enough for a dashboard glance, and avoids a setInterval
  // just to keep "next route" accurate to the minute. Prefer the user's
  // Home route (if set) over whichever route happens to depart soonest —
  // computeNextRoute still picks the actual upcoming occurrence for it
  // (day/exceptions aware), just restricted to that one route.
  const next: NextRoute | null = useMemo(() => {
    // Restrict to the Home route first; if it has no upcoming occurrence
    // in the lookahead window (e.g. every day off this fortnight), fall
    // back to whichever saved route departs soonest instead of going blank.
    const homeNext = homeRoute ? computeNextRoute([homeRoute], exceptions, new Date()) : null;
    return homeNext ?? computeNextRoute(routes, exceptions, new Date());
  }, [homeRoute, routes, exceptions]);
  const isHomeActive = !!homeRoute && next?.route.id === homeRoute.id;

  const lineNames = next?.route.legs.map((leg) => lineById(leg.line)?.name ?? leg.line).join(" → ");

  // Real crowd count from app/api/pings/counts (server/openapi.yaml)
  // where a backend exists; falls back to lib/crowd-mock.ts's illustrative
  // mock everywhere else (e.g. the GitHub Pages static export, or if the
  // fetch just fails) — same shape either way so the UI below doesn't care
  // which one it got.
  const [crowd, setCrowd] = useState<CrowdMock | null>(null);

  useEffect(() => {
    if (!next) {
      setCrowd(null);
      return;
    }

    const station = next.route.legs[0].originStation;
    const timeBucket = timeToMinutes(next.route.departureTime);
    const fallback = mockCrowdFor(next.route.id, next.date);
    setCrowd(fallback);

    let cancelled = false;

    // Fire-and-forget: register that this device is planning this trip.
    // No-op-on-failure, since a static export or an unreachable API
    // shouldn't block rendering the dashboard.
    putPing({
      routeId: next.route.id,
      station,
      lineId: next.route.legs[0].line,
      tripDate: next.date,
      timeBucket,
    }).catch(() => {});

    getPingCounts(station, next.date, timeBucket)
      .then(({ count, suppressed }) => {
        if (cancelled || suppressed || count === null) return;
        setCrowd({ count, busier: count > 150 });
      })
      .catch(() => {
        // Keep the mock fallback already set above.
      });

    return () => {
      cancelled = true;
    };
  }, [next]);
  const dateLabel = next
    ? next.date === new Date().toISOString().slice(0, 10)
      ? t.dashboard.today
      : next.departureAt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    : "";

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-8">
        <h1 className="text-lg font-semibold text-foreground">{t.dashboard.title}</h1>

        {!next ? (
          <EmptyState />
        ) : (
          <>
            <div className="relative w-full rounded-2xl border border-border bg-background p-5">
              <span
                className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
                style={{ backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
              >
                {t.dashboard.conceptBadge}
              </span>

              <div className="flex flex-col gap-0.5 pr-20">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {next.route.legs[0].originStation} · {lineNames}
                  {isHomeActive && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
                      style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                    >
                      {t.dashboard.homeBadge}
                    </span>
                  )}
                </span>
                <span className="text-xs text-foreground/60">
                  {dateLabel}, {next.route.departureTime}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ backgroundColor: "var(--primary)" }}
                  />
                  <span className="relative inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                </span>
                <span className="text-3xl font-semibold text-foreground">{crowd?.count}</span>
                <span className="text-sm text-foreground/60">{t.dashboard.peoplePlanning}</span>
              </div>

              {crowd?.busier && (
                <p
                  className="mt-4 rounded-lg px-3 py-2 text-xs text-foreground"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
                >
                  {t.dashboard.busierSuggestion(next.route.alternateLegs ? (lineById(next.route.alternateLegs[0].line)?.name ?? "") : "")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-background">
              <div className="h-56 w-full">
                <RouteMap legs={next.route.legs} />
              </div>
              <Link
                href={`/route?id=${next.route.id}`}
                className="px-4 pb-4 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {t.dashboard.viewDetails}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mx-auto w-fit cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
            >
              {t.dashboard.changePlan}
            </button>
          </>
        )}

        {modalOpen && next && (
          <ChangePlanModal date={next.date} routes={routes} onClose={() => setModalOpen(false)} />
        )}
      </div>
    </Shell>
  );
}
