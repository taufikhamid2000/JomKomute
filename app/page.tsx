"use client";

// Waze-style map-first home screen: a full-screen map with a bottom panel
// for "Where to?", Home/Work quick access, and the saved-routes list. The
// old "all my saved routes" list that used to live here now lives at
// app/routes/page.tsx (reachable via the sidebar's "Routes" link).

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/combobox";
import { Shell } from "@/components/shell";
import { distanceMeters } from "@/lib/geo-distance";
import { lineById } from "@/lib/lines";
import { reportCategoryMeta } from "@/lib/report-categories";
import { allStationNames, findRouteOptions, type RouteOption } from "@/lib/route-finder";
import { STATION_COORDS } from "@/lib/stations";
import { useSavedRoutes } from "@/lib/store";
import type { RouteLeg, SavedRoute } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";
import { getRecentUserReports, type UserReport } from "@/lib/user-reports-client";

// react-leaflet touches window/document at module load — dynamic-import
// with ssr:false so next.config.ts's static export (prerendered with no
// browser present) doesn't break on this route (same pattern as
// app/report/page.tsx's ReportMap / app/dashboard/page.tsx's RouteMap).
const HomeMap = dynamic(() => import("@/components/home-map").then((m) => m.HomeMap), { ssr: false });

function QuickAccessCard({
  label,
  route,
  onSelect,
}: {
  label: string;
  route: SavedRoute;
  onSelect: (route: SavedRoute) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(route)}
      className="flex min-w-[9rem] flex-1 flex-col gap-0.5 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/40"
    >
      <span className="text-[10px] font-medium tracking-wide text-foreground/50 uppercase">{label}</span>
      <span className="truncate text-sm font-semibold text-foreground">{route.label}</span>
      <span className="truncate text-xs text-foreground/60">
        {route.legs[0].originStation} <span aria-hidden="true">→</span> {route.legs[route.legs.length - 1].destinationStation}
      </span>
    </button>
  );
}

export default function HomePage() {
  const { t } = useDictionary();
  const { routes } = useSavedRoutes();
  // Tapping Home/Work sets the route "active" on the map — like starting
  // nav, not just linking away to its detail page (that's still one tap
  // further, via the collapsed handle below). null = no route selected,
  // panel shows the full "Where to?" / quick-access / recent-routes content.
  const [activeRoute, setActiveRoute] = useState<SavedRoute | null>(null);
  // A one-off "Where to?" lookup — ephemeral, never written to
  // lib/store.ts/localStorage (unlike activeRoute above, which is always a
  // saved route). Only one of activeRoute / oneTimeRoute is set at a time;
  // picking Home/Work/a recent route clears this, and vice versa.
  const [oneTimeRoute, setOneTimeRoute] = useState<{ legs: RouteLeg[]; origin: string; destination: string } | null>(null);
  // Populated by "Go" — candidate routes the rider picks from before any
  // of them becomes the active oneTimeRoute. Only one of
  // activeRoute/oneTimeRoute/routeOptions is meaningfully "current" at a
  // time; picking an option clears this and sets oneTimeRoute instead.
  const [routeOptions, setRouteOptions] = useState<RouteOption[] | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [showLeaveLater, setShowLeaveLater] = useState(false);
  const [leaveLaterTime, setLeaveLaterTime] = useState("");
  const [finderOrigin, setFinderOrigin] = useState("");
  const [finderDestination, setFinderDestination] = useState("");
  const [finderNotFound, setFinderNotFound] = useState(false);
  const stationNames = allStationNames();

  // Fetch nearby reports once route options become available — same
  // "last 24h" scope getRecentUserReports already implements for
  // app/report/page.tsx's list, no new query pattern needed.
  useEffect(() => {
    if (!routeOptions || routeOptions.length === 0) return;
    let cancelled = false;
    getRecentUserReports()
      .then((r) => {
        if (!cancelled) setReports(r);
      })
      .catch(() => {
        // Best-effort overlay — a failed fetch just means no hazard chip/markers, not a broken screen.
      });
    return () => {
      cancelled = true;
    };
  }, [routeOptions]);

  function handleSelectSaved(route: SavedRoute) {
    setOneTimeRoute(null);
    setRouteOptions(null);
    setActiveRoute(route);
  }

  function handleFindRoute() {
    if (!finderOrigin || !finderDestination) return;
    const options = findRouteOptions(finderOrigin, finderDestination);
    if (options) {
      setFinderNotFound(false);
      setActiveRoute(null);
      setOneTimeRoute(null);
      setSelectedOptionIndex(0);
      setShowLeaveLater(false);
      setRouteOptions(options);
    } else {
      setFinderNotFound(true);
    }
  }

  function handleStartOption(option: RouteOption) {
    setRouteOptions(null);
    setShowLeaveLater(false);
    setOneTimeRoute({ legs: option.legs, origin: finderOrigin, destination: finderDestination });
  }

  function resetToOverview() {
    setActiveRoute(null);
    setOneTimeRoute(null);
    setRouteOptions(null);
    setFinderNotFound(false);
    setShowLeaveLater(false);
  }

  // Every point (in order) along an option's legs, for the "nearby
  // hazard" nearest-report check below — same station-expansion the map
  // uses, just without pulling in home-map.tsx's internals.
  function optionRoutePoints(option: RouteOption): [number, number][] {
    const points: [number, number][] = [];
    for (const leg of option.legs) {
      const line = lineById(leg.line);
      if (!line) continue;
      const stations = line.stations as readonly string[];
      const originIdx = stations.indexOf(leg.originStation);
      const destIdx = stations.indexOf(leg.destinationStation);
      if (originIdx === -1 || destIdx === -1) continue;
      const slice = originIdx <= destIdx ? stations.slice(originIdx, destIdx + 1) : stations.slice(destIdx, originIdx + 1);
      for (const name of slice) {
        const coord = STATION_COORDS[name];
        if (coord) points.push(coord);
      }
    }
    return points;
  }

  const categoryMeta = useMemo(
    () =>
      reportCategoryMeta(t.reportPage.categories),
    [t],
  );

  const nearestReportForSelected = useMemo(() => {
    if (!routeOptions || routeOptions.length === 0 || reports.length === 0) return null;
    const option = routeOptions[selectedOptionIndex];
    if (!option) return null;
    const points = optionRoutePoints(option);
    if (points.length === 0) return null;
    let best: { report: UserReport; dist: number } | null = null;
    for (const report of reports) {
      for (const p of points) {
        const d = distanceMeters({ lat: report.lat, lng: report.lng }, { lat: p[0], lng: p[1] });
        if (d <= 300 && (!best || d < best.dist)) best = { report, dist: d };
      }
    }
    return best?.report ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOptions, selectedOptionIndex, reports]);

  const homeRoute = routes.find((r) => r.isHome);
  const workRoute = routes.find((r) => r.isWork);
  const recent = [...routes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <Shell>
      <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <HomeMap
          legs={activeRoute?.legs ?? oneTimeRoute?.legs ?? homeRoute?.legs}
          routeOptions={routeOptions ?? undefined}
          selectedOptionIndex={selectedOptionIndex}
          onSelectOption={setSelectedOptionIndex}
          reports={reports}
        />

        {activeRoute ? (
          <div className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-2 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-foreground">{activeRoute.label}</span>
                <span className="truncate text-xs text-foreground/60">
                  {activeRoute.legs[0].originStation} <span aria-hidden="true">→</span>{" "}
                  {activeRoute.legs[activeRoute.legs.length - 1].destinationStation}
                </span>
              </div>
              <Link
                href={`/route?id=${activeRoute.id}`}
                className="shrink-0 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {t.dashboard.viewDetails}
              </Link>
            </div>
            <button
              type="button"
              onClick={resetToOverview}
              className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.homePage.changeRoute}
            </button>
          </div>
        ) : routeOptions ? (
          <div className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4">
            {(() => {
              const selected = routeOptions[selectedOptionIndex] ?? routeOptions[0];
              const lineNames = Array.from(new Set(selected.legs.map((leg) => lineById(leg.line)?.name ?? leg.line))).join(" → ");
              const hazardMeta = nearestReportForSelected ? categoryMeta.find((m) => m.id === nearestReportForSelected.category) : null;
              return (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-2xl font-bold text-foreground">{Math.round(selected.totalMinutes)} min</span>
                    <span className="text-xs text-foreground/60">
                      {t.routesPage.transfer(selected.transfers)} · {t.homePage.optionStations(selected.stationCount)}
                    </span>
                  </div>
                  <span className="truncate text-sm text-foreground/70">{t.homePage.optionVia(lineNames)}</span>
                  {hazardMeta && (
                    <div className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${hazardMeta.color}1a`, color: hazardMeta.color }}>
                      {hazardMeta.icon}
                      {t.homePage.hazardNearby(hazardMeta.label)}
                    </div>
                  )}
                </>
              );
            })()}

            {routeOptions.length > 1 && (
              <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                {routeOptions.map((option, i) => {
                  const lineNames = Array.from(new Set(option.legs.map((leg) => lineById(leg.line)?.name ?? leg.line))).join(" → ");
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedOptionIndex(i)}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                        i === selectedOptionIndex ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-xs font-medium text-foreground">{t.homePage.optionVia(lineNames)}</span>
                        <span className="truncate text-[11px] text-foreground/60">
                          {t.routesPage.transfer(option.transfers)} · {t.homePage.optionStations(option.stationCount)}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">{Math.round(option.totalMinutes)} min</span>
                    </button>
                  );
                })}
              </div>
            )}

            {showLeaveLater ? (
              <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                <input
                  type="time"
                  value={leaveLaterTime}
                  onChange={(e) => setLeaveLaterTime(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowLeaveLater(false)}
                  className="shrink-0 cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {t.homePage.optionStart}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleStartOption(routeOptions[selectedOptionIndex] ?? routeOptions[0])}
                  className="flex-1 cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {t.homePage.goNow}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveLater(true)}
                  className="flex-1 cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {t.homePage.leaveLater}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={resetToOverview}
              className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.homePage.changeRoute}
            </button>
          </div>
        ) : oneTimeRoute ? (
          <div className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-2 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {t.homePage.finderSummary(oneTimeRoute.origin, oneTimeRoute.destination)}
              </span>
            </div>
            <Link
              href={`/new?prefillLegs=${encodeURIComponent(JSON.stringify(oneTimeRoute.legs))}`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t.homePage.saveAsRegular}
            </Link>
            <button
              type="button"
              onClick={resetToOverview}
              className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.homePage.changeRoute}
            </button>
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4">
            <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-foreground/50">
                  <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.75" />
                  <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-medium text-foreground">{t.homePage.whereTo}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Combobox
                  value={finderOrigin}
                  onChange={(station) => {
                    setFinderOrigin(station);
                    setFinderNotFound(false);
                  }}
                  options={stationNames}
                  placeholder={t.legsEditor.from}
                  noResultsLabel={t.legsEditor.noStationsFound}
                />
                <Combobox
                  value={finderDestination}
                  onChange={(station) => {
                    setFinderDestination(station);
                    setFinderNotFound(false);
                  }}
                  options={stationNames}
                  placeholder={t.legsEditor.to}
                  noResultsLabel={t.legsEditor.noStationsFound}
                />
              </div>
              <button
                type="button"
                onClick={handleFindRoute}
                disabled={!finderOrigin || !finderDestination}
                className="w-fit cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.homePage.finderGo}
              </button>
              {finderNotFound && <p className="text-xs text-destructive">{t.homePage.finderNotFound}</p>}
            </div>

            {homeRoute || workRoute ? (
              <div className="flex gap-2">
                {homeRoute ? (
                  <QuickAccessCard label={t.homePage.homeQuickAccess} route={homeRoute} onSelect={handleSelectSaved} />
                ) : (
                  <Link
                    href="/new"
                    className="flex min-w-[9rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border p-3 text-center text-xs text-foreground/50 transition-colors hover:border-primary/40"
                  >
                    {t.homePage.setHomePrompt}
                  </Link>
                )}
                {workRoute ? (
                  <QuickAccessCard label={t.homePage.workQuickAccess} route={workRoute} onSelect={handleSelectSaved} />
                ) : (
                  <Link
                    href="/new"
                    className="flex min-w-[9rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border p-3 text-center text-xs text-foreground/50 transition-colors hover:border-primary/40"
                  >
                    {t.homePage.setWorkPrompt}
                  </Link>
                )}
              </div>
            ) : (
              <Link
                href="/new"
                className="flex flex-col gap-1 rounded-xl border border-dashed border-border p-3 text-center transition-colors hover:border-primary/40"
              >
                <span className="text-sm font-medium text-foreground">{t.homePage.noQuickAccessTitle}</span>
                <span className="text-xs text-foreground/60">{t.homePage.noQuickAccessDescription}</span>
              </Link>
            )}

            {recent.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-medium tracking-wide text-foreground/50 uppercase">{t.homePage.recentTitle}</span>
                <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                  {recent.map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => handleSelectSaved(route)}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <span className="truncate">{route.label}</span>
                      <span className="shrink-0 truncate text-xs text-foreground/50">
                        {route.legs[0].originStation} → {route.legs[route.legs.length - 1].destinationStation}
                      </span>
                    </button>
                  ))}
                </div>
                <Link href="/routes" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                  {t.homePage.viewAllRoutes}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
