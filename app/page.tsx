"use client";

// Waze-style map-first home screen: a full-screen map with a bottom panel
// for "Where to?", Home/Work quick access, and the saved-routes list. The
// old "all my saved routes" list that used to live here now lives at
// app/routes/page.tsx (reachable via the sidebar's "Routes" link).

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChangePlanModal } from "@/components/change-plan-modal";
import { Combobox } from "@/components/combobox";
import { ReportModal } from "@/components/report-modal";
import { Shell } from "@/components/shell";
import { mockCrowdFor, type CrowdMock } from "@/lib/crowd-mock";
import { distanceMeters } from "@/lib/geo-distance";
import { lineById } from "@/lib/lines";
import { computeNextRoute, type NextRoute } from "@/lib/next-route";
import {
  formatClockTime,
  getLineOperatingHours,
  isWeekend,
  minutesUntilLastTrain,
  type LineOperatingHours,
} from "@/lib/operating-hours-client";
import { getPingCounts, putPing } from "@/lib/pings-client";
import { reportCategoryMeta } from "@/lib/report-categories";
import { reportableStationOptions } from "@/lib/route-corridor";
import { findRoute, findRouteOptions as findRouteOptionsFor, type RouteOption } from "@/lib/route-finder";
import { STATION_COORDS } from "@/lib/stations";
import { useAllExceptions, useSavedRoutes } from "@/lib/store";
import type { RouteLeg, SavedRoute } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";
import { useRouteFinderOptions } from "@/lib/use-route-finder";
import { getRecentUserReports, type UserReport } from "@/lib/user-reports-client";

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

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
        {route.originStation} <span aria-hidden="true">→</span> {route.destinationStation}
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
  const [operatingHours, setOperatingHours] = useState<LineOperatingHours[]>([]);
  const [showLeaveLater, setShowLeaveLater] = useState(false);
  const [leaveLaterTime, setLeaveLaterTime] = useState("");
  // "Change plan" (skip today / WFH / driving) — ported from the old
  // app/dashboard/page.tsx, only meaningful for a saved (Home/Work/recent)
  // route, not a one-off finder lookup.
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  // Waze-style report FAB — opens an inline modal instead of navigating to
  // a separate page (see components/report-modal.tsx). /report itself is
  // still reachable directly, now repurposed as a browse-and-vote map.
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // "Tap a station on the map" for components/report-modal.tsx's "Pick a
  // station" mode — the modal draws no map of its own, so picking a
  // station by tapping happens directly on this page's own HomeMap
  // instead. isPickingStationOnMap true hides the modal (and the bottom
  // sheet, to maximize tappable map area) and switches HomeMap into
  // pick mode; mapPickedStation carries the result back to the modal
  // once, then the modal acknowledges it via onPickedStationConsumed.
  const [isPickingStationOnMap, setIsPickingStationOnMap] = useState(false);
  const [mapPickedStation, setMapPickedStation] = useState<string | null>(null);
  // Waze-style bottom-sheet collapse: tap the handle (or the collapsed
  // strip itself) to shrink the panel down to a thin, tappable bar so more
  // of the map is visible, and tap it again to restore full content. This
  // applies uniformly across all three panel states below (idle finder,
  // route-options, active-route) rather than being wired into just one —
  // see the shared `panelSummary` computed further down for what the
  // collapsed strip shows per state.
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Physical drag-to-collapse/expand on top of the tap-to-toggle above.
  // `dragOffset` is a live pixel translateY applied to whichever panel
  // container is currently rendered, so the sheet visually follows the
  // finger during the gesture; it's purely a render-time offset — the
  // single source of truth for collapsed/expanded stays isPanelCollapsed,
  // updated only on release (tap or snap). Drag bookkeeping (start Y,
  // whether the pointer has moved enough to count as a drag rather than a
  // tap, and the live offset) lives in a ref rather than state since
  // pointermove fires far more often than a render needs to be gated on.
  const DRAG_TAP_THRESHOLD_PX = 6; // movement under this = a tap, not a drag
  const DRAG_RANGE_PX = 96; // full travel mapped for the drag gesture
  const DRAG_SNAP_RATIO = 0.3; // >30% of DRAG_RANGE_PX toggles state on release
  const dragRef = useRef<{ startY: number; offset: number; moved: boolean } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isHandleDragging, setIsHandleDragging] = useState(false);

  function handleHandlePointerDown(e: React.PointerEvent<HTMLElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, offset: 0, moved: false };
    setIsHandleDragging(true);
  }

  function handleHandlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const info = dragRef.current;
    if (!info) return;
    const delta = e.clientY - info.startY;
    if (Math.abs(delta) > DRAG_TAP_THRESHOLD_PX) info.moved = true;
    // Collapsed: only allow dragging up (toward expanding), delta <= 0.
    // Expanded: only allow dragging down (toward collapsing), delta >= 0.
    const clamped = isPanelCollapsed
      ? Math.min(0, Math.max(-DRAG_RANGE_PX, delta))
      : Math.max(0, Math.min(DRAG_RANGE_PX, delta));
    info.offset = clamped;
    setDragOffset(clamped);
  }

  function endHandleDrag(e: React.PointerEvent<HTMLElement>, commit: boolean) {
    const info = dragRef.current;
    dragRef.current = null;
    setIsHandleDragging(false);
    setDragOffset(0);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released (e.g. pointercancel) — fine to ignore.
    }
    if (!info || !commit) return;
    if (!info.moved) {
      // Negligible movement — treat as a plain tap, same as the old click handler.
      setIsPanelCollapsed((prev) => !prev);
      return;
    }
    const ratio = Math.abs(info.offset) / DRAG_RANGE_PX;
    if (ratio > DRAG_SNAP_RATIO) setIsPanelCollapsed((prev) => !prev);
  }

  function handleHandlePointerUp(e: React.PointerEvent<HTMLElement>) {
    endHandleDrag(e, true);
  }

  function handleHandlePointerCancel(e: React.PointerEvent<HTMLElement>) {
    endHandleDrag(e, false);
  }

  const dragHandleProps = {
    onPointerDown: handleHandlePointerDown,
    onPointerMove: handleHandlePointerMove,
    onPointerUp: handleHandlePointerUp,
    onPointerCancel: handleHandlePointerCancel,
  };
  // Applied to whichever panel container is current so it translates with
  // the live drag offset and snaps smoothly on release; transition is
  // suspended while actively dragging for 1:1 finger tracking.
  const panelDragStyle = {
    transform: dragOffset !== 0 ? `translateY(${dragOffset}px)` : undefined,
    transition: isHandleDragging ? "none" : "transform 200ms ease-out",
  };

  const exceptions = useAllExceptions();
  const {
    origin: finderOrigin,
    destination: finderDestination,
    notFound: finderNotFound,
    setNotFound: setFinderNotFound,
    setOrigin: setFinderOrigin,
    setDestination: setFinderDestination,
    stationNames,
    find: findRouteOptions,
  } = useRouteFinderOptions();

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

  // Fetched once, up front (unlike reports above) — this is small, rarely
  // changing reference data, not something worth re-fetching per route
  // selection. Best-effort: a failed/empty fetch just means no "last
  // train" hint, not a broken screen.
  useEffect(() => {
    getLineOperatingHours()
      .then(setOperatingHours)
      .catch(() => {});
  }, []);

  function handleSelectSaved(route: SavedRoute) {
    setOneTimeRoute(null);
    setRouteOptions(null);
    setActiveRoute(route);
    setIsPanelCollapsed(false);
  }

  function handleFindRoute() {
    const options = findRouteOptions();
    if (options) {
      setActiveRoute(null);
      setOneTimeRoute(null);
      setSelectedOptionIndex(0);
      setShowLeaveLater(false);
      setRouteOptions(options);
      setIsPanelCollapsed(false);
    }
  }

  function handleStartOption(option: RouteOption) {
    setRouteOptions(null);
    setShowLeaveLater(false);
    setOneTimeRoute({ legs: option.legs, origin: finderOrigin, destination: finderDestination });
    setIsPanelCollapsed(false);
  }

  function resetToOverview() {
    setActiveRoute(null);
    setOneTimeRoute(null);
    setRouteOptions(null);
    setFinderNotFound(false);
    setShowLeaveLater(false);
    setIsPanelCollapsed(false);
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

  // Soonest-closing line among the selected option's legs, if any of them
  // is due to close within the next 90 minutes — a light "last train"
  // nudge, not a full schedule. `now` is captured once per option
  // selection (not re-ticked live) since a rider glancing at this doesn't
  // need second-by-second accuracy.
  const lastTrainHintForSelected = useMemo(() => {
    if (!routeOptions || routeOptions.length === 0 || operatingHours.length === 0) return null;
    const option = routeOptions[selectedOptionIndex];
    if (!option) return null;
    const now = new Date();
    let best: { lineName: string; minutes: number; time: string } | null = null;
    for (const leg of option.legs) {
      const hours = operatingHours.find((h) => h.lineId === leg.line);
      if (!hours) continue;
      const minutes = minutesUntilLastTrain(hours, now);
      if (minutes === null || minutes > 90) continue;
      const last = now.getDay() === 0 || now.getDay() === 6 ? hours.weekendLast : hours.weekdayLast;
      if (!last) continue;
      if (!best || minutes < best.minutes) {
        best = { lineName: hours.lineName ?? lineById(leg.line)?.name ?? leg.line, minutes, time: formatClockTime(last) };
      }
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOptions, selectedOptionIndex, operatingHours]);

  // "Last train ~11:45pm on the X Line" — only surfaced when the selected
  // option's last leg's line has a last departure within ~90 minutes of
  // now, so this doesn't clutter the sheet for a mid-afternoon trip.
  const lastTrainHint = useMemo(() => {
    if (!routeOptions || routeOptions.length === 0 || operatingHours.length === 0) return null;
    const option = routeOptions[selectedOptionIndex];
    if (!option || option.legs.length === 0) return null;
    const lastLeg = option.legs[option.legs.length - 1];
    const hours = operatingHours.find((h) => h.lineId === lastLeg.line);
    if (!hours) return null;
    const minutesLeft = minutesUntilLastTrain(hours, new Date());
    if (minutesLeft === null || minutesLeft > 90) return null;
    const time = isWeekend(new Date()) ? hours.weekendLast : hours.weekdayLast;
    if (!time) return null;
    const line = lineById(lastLeg.line);
    return { time: formatClockTime(time), lineName: line?.name ?? lastLeg.line };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOptions, selectedOptionIndex, operatingHours]);

  const homeRoute = routes.find((r) => r.isHome);
  const workRoute = routes.find((r) => r.isWork);
  const recent = [...routes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  // Legs are computed live from origin/destination rather than stored —
  // see lib/types.ts's SavedRoute for why. Kept as two separate memos
  // (rather than one "whichever route is active" memo) so the same
  // activeRoute -> oneTimeRoute -> homeRoute priority the map prop used to
  // read `.legs` off directly still holds — oneTimeRoute's legs are
  // already ephemeral RouteOption legs, not something to recompute.
  const activeLegs = useMemo(
    () => (activeRoute ? findRoute(activeRoute.originStation, activeRoute.destinationStation) : undefined),
    [activeRoute],
  );
  const homeLegs = useMemo(
    () => (homeRoute ? findRoute(homeRoute.originStation, homeRoute.destinationStation) : undefined),
    [homeRoute],
  );

  // "Next trip" info (departure date/time, crowd count, busier-alternate
  // suggestion) for the currently active saved route — ported from the old
  // app/dashboard/page.tsx, which showed exactly this for whichever route
  // was "next" across every saved route. Here it's scoped to just the
  // route the rider tapped (Home/Work/recent), since Home no longer picks
  // a route on its own the way the old dashboard did.
  const activeNext: NextRoute | null = useMemo(
    () => (activeRoute ? computeNextRoute([activeRoute], exceptions, new Date()) : null),
    [activeRoute, exceptions],
  );
  const activeRouteOptions = useMemo(
    () => (activeRoute ? findRouteOptionsFor(activeRoute.originStation, activeRoute.destinationStation) : undefined),
    [activeRoute],
  );
  const activeAlternateLegs = activeRouteOptions?.[1]?.legs;

  const [activeCrowd, setActiveCrowd] = useState<CrowdMock | null>(null);

  useEffect(() => {
    if (!activeNext || !activeLegs || activeLegs.length === 0) {
      setActiveCrowd(null);
      return;
    }

    const station = activeNext.route.originStation;
    const timeBucket = timeToMinutes(activeNext.route.departureTime);
    const fallback = mockCrowdFor(activeNext.route.id, activeNext.date);
    setActiveCrowd(fallback);

    let cancelled = false;

    // Fire-and-forget: register that this device is planning this trip. See
    // lib/pings-client.ts's header for why a failed call is a no-op.
    putPing({
      routeId: activeNext.route.id,
      station,
      lineId: activeLegs[0].line,
      tripDate: activeNext.date,
      timeBucket,
    }).catch(() => {});

    getPingCounts(station, activeNext.date, timeBucket)
      .then(({ count, suppressed }) => {
        if (cancelled || suppressed || count === null) return;
        setActiveCrowd({ count, busier: count > 150 });
      })
      .catch(() => {
        // Keep the mock fallback already set above.
      });

    return () => {
      cancelled = true;
    };
  }, [activeNext, activeLegs]);

  const activeDateLabel = activeNext
    ? activeNext.date === new Date().toISOString().slice(0, 10)
      ? t.dashboard.today
      : activeNext.departureAt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    : "";

  // Whichever route the map is currently showing — same priority
  // HomeMap's legs prop already uses below. Shared into a variable so the
  // report modal can scope its corridor check to the same route (Phase
  // 3's route-scoped reporting, see lib/route-corridor.ts) instead of
  // duplicating this fallback chain.
  const reportableLegs = activeLegs ?? oneTimeRoute?.legs ?? homeLegs;
  // /report is still directly reachable as a browse-and-vote map (see
  // app/report/page.tsx); carry the same legs as ?legs= so it can draw
  // the corridor as a visual guide, same param it always read.
  const reportsHref =
    reportableLegs && reportableLegs.length > 0
      ? `/report?legs=${encodeURIComponent(JSON.stringify(reportableLegs))}`
      : "/report";
  // The exact station list components/report-modal.tsx's Combobox
  // offers — computed here too so HomeMap's "tap to pick a station"
  // overlay (only shown while isPickingStationOnMap) offers the same
  // set, not a second independently-derived list.
  const reportStationOptions = useMemo(() => reportableStationOptions(reportableLegs), [reportableLegs]);

  // One-line context shown on the collapsed strip — mirrors whichever of
  // the three panel states is current, same priority order as the
  // full-panel ternary below (activeRoute -> routeOptions -> oneTimeRoute
  // -> idle finder).
  const panelSummary = activeRoute
    ? `${activeRoute.label} · ${activeRoute.destinationStation}`
    : routeOptions
      ? (() => {
          const selected = routeOptions[selectedOptionIndex] ?? routeOptions[0];
          return `${Math.round(selected.totalMinutes)} min · ${finderDestination}`;
        })()
      : oneTimeRoute
        ? t.homePage.finderSummary(oneTimeRoute.origin, oneTimeRoute.destination)
        : t.homePage.whereTo;

  return (
    <Shell>
      <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <HomeMap
          legs={reportableLegs}
          routeOptions={routeOptions ?? undefined}
          selectedOptionIndex={selectedOptionIndex}
          onSelectOption={setSelectedOptionIndex}
          reports={reports}
          pickableStations={isPickingStationOnMap ? reportStationOptions : undefined}
          onPickStation={
            isPickingStationOnMap
              ? (name) => {
                  setMapPickedStation(name);
                  setIsPickingStationOnMap(false);
                }
              : undefined
          }
        />

        {/* Waze-style floating action button — opens the report modal in
            place (see components/report-modal.tsx) instead of navigating
            to a separate page. Fixed to the viewport corner (not a
            Leaflet marker) so it never pans/zooms with the map, and
            positioned bottom-right with enough bottom offset to clear the
            bottom sheet's collapsed height (the sheet's tallest collapsed
            state is the "Where to?" card, roughly 3.5rem tall as rendered
            below). Home-screen only, by design — not a global overlay.
            Passes the active route's legs so the modal can scope its
            corridor check (Phase 3) — with no active route, submission is
            unrestricted, same as before Phase 3. */}
        {!isPickingStationOnMap && (
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            aria-label={t.homePage.reportFab}
            title={t.homePage.reportFab}
            className="absolute right-4 bottom-40 z-[1100] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-[0_4px_12px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 active:scale-95 md:right-6"
          >
            <svg width="26" height="26" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2.5 18 17H2L10 2.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M10 8v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              <circle cx="10" cy="14.3" r="1" fill="currentColor" />
            </svg>
          </button>
        )}

        {/* Waze-style collapsible bottom sheet: tapping the handle strip
            below shrinks whichever of the four panel states is current
            down to a thin, tappable bar so more of the map is visible,
            without losing the underlying state (activeRoute/routeOptions/
            oneTimeRoute/idle finder are all untouched while collapsed —
            only the rendered panel changes). Precedent for the
            tap-to-toggle "found summary" card pattern is
            components/route-form.tsx's collapsed finder card. */}
        {!isPickingStationOnMap && (isPanelCollapsed ? (
          <button
            type="button"
            {...dragHandleProps}
            aria-label={t.homePage.whereTo}
            style={panelDragStyle}
            className="absolute inset-x-0 bottom-0 z-[1000] flex w-full cursor-pointer touch-none flex-col items-center gap-1.5 rounded-t-2xl border-t border-border bg-background px-4 pt-2 pb-3 text-left shadow-[0_-4px_16px_rgba(0,0,0,0.12)] transition-colors hover:bg-muted md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4"
          >
            <span className="h-1.5 w-10 shrink-0 rounded-full bg-foreground/20" aria-hidden="true" />
            <span className="w-full truncate text-center text-sm font-medium text-foreground">{panelSummary}</span>
          </button>
        ) : activeRoute ? (
          <div
            style={panelDragStyle}
            className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-2 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4"
          >
            <button
              type="button"
              {...dragHandleProps}
              aria-label="Collapse panel"
              className="-mt-1 flex w-full cursor-pointer touch-none items-center justify-center pb-1"
            >
              <span className="h-1.5 w-10 rounded-full bg-foreground/20" aria-hidden="true" />
            </button>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-foreground">{activeRoute.label}</span>
                <span className="truncate text-xs text-foreground/60">
                  {activeRoute.originStation} <span aria-hidden="true">→</span> {activeRoute.destinationStation}
                </span>
                {activeNext && (
                  <span className="truncate text-xs text-foreground/60">
                    {activeDateLabel}, {activeNext.route.departureTime}
                  </span>
                )}
              </div>
              <Link
                href={`/route?id=${activeRoute.id}`}
                className="shrink-0 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {t.dashboard.viewDetails}
              </Link>
            </div>

            {activeNext && (
              <div className="flex items-center gap-2 rounded-xl border border-border p-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ backgroundColor: "var(--primary)" }}
                  />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                </span>
                <span className="text-xl font-semibold text-foreground">{activeCrowd?.count}</span>
                <span className="text-xs text-foreground/60">{t.dashboard.peoplePlanning}</span>
                <span
                  className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
                  style={{ backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
                >
                  {t.dashboard.conceptBadge}
                </span>
              </div>
            )}
            {activeCrowd?.busier && (
              <p
                className="rounded-lg px-3 py-2 text-xs text-foreground"
                style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
              >
                {t.dashboard.busierSuggestion(activeAlternateLegs ? (lineById(activeAlternateLegs[0].line)?.name ?? "") : "")}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChangePlanOpen(true)}
                className="flex-1 cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
              >
                {t.dashboard.changePlan}
              </button>
              <button
                type="button"
                onClick={resetToOverview}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t.homePage.changeRoute}
              </button>
            </div>
          </div>
        ) : routeOptions ? (
          <div
            style={panelDragStyle}
            className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4"
          >
            <button
              type="button"
              {...dragHandleProps}
              aria-label="Collapse panel"
              className="-mt-1 flex w-full cursor-pointer touch-none items-center justify-center pb-1"
            >
              <span className="h-1.5 w-10 rounded-full bg-foreground/20" aria-hidden="true" />
            </button>
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
                  {lastTrainHintForSelected && (
                    <div className="flex w-fit items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M10 5.5V10l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {t.homePage.lastTrainSoon(lastTrainHintForSelected.time, lastTrainHintForSelected.lineName)}
                    </div>
                  )}
                  {lastTrainHint && (
                    <div className="flex w-fit items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      {t.homePage.lastTrainSoon(lastTrainHint.time, lastTrainHint.lineName)}
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
          <div
            style={panelDragStyle}
            className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-2 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4"
          >
            <button
              type="button"
              {...dragHandleProps}
              aria-label="Collapse panel"
              className="-mt-1 flex w-full cursor-pointer touch-none items-center justify-center pb-1"
            >
              <span className="h-1.5 w-10 rounded-full bg-foreground/20" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {t.homePage.finderSummary(oneTimeRoute.origin, oneTimeRoute.destination)}
              </span>
            </div>
            <Link
              href={`/new?prefillOrigin=${encodeURIComponent(oneTimeRoute.origin)}&prefillDestination=${encodeURIComponent(oneTimeRoute.destination)}`}
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
          <div
            style={panelDragStyle}
            className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:mx-auto md:max-w-2xl md:rounded-2xl md:border md:mb-4"
          >
            <button
              type="button"
              {...dragHandleProps}
              aria-label="Collapse panel"
              className="-mt-1 flex w-full cursor-pointer touch-none items-center justify-center pb-1"
            >
              <span className="h-1.5 w-10 rounded-full bg-foreground/20" aria-hidden="true" />
            </button>
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
                  onChange={setFinderOrigin}
                  options={stationNames}
                  placeholder={t.legsEditor.from}
                  noResultsLabel={t.legsEditor.noStationsFound}
                />
                <Combobox
                  value={finderDestination}
                  onChange={setFinderDestination}
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
                        {route.originStation} → {route.destinationStation}
                      </span>
                    </button>
                  ))}
                </div>
                <Link href="/routes" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                  {t.homePage.viewAllRoutes}
                </Link>
              </div>
            )}

            {/* /report is still directly reachable (it's now a
                browse-and-vote map, not the tap-to-report flow — see
                components/report-map.tsx) — surfaced here rather than
                left findable only by URL. */}
            <Link href={reportsHref} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              {t.reportPage.browseReports}
            </Link>
          </div>
        ))}

        {isPickingStationOnMap && (
          <div className="absolute inset-x-0 bottom-6 z-[1000] mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
            <span className="truncate text-sm font-medium text-foreground">{t.reportPage.pickOnMapInstruction}</span>
            <button
              type="button"
              onClick={() => setIsPickingStationOnMap(false)}
              className="shrink-0 cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t.reportPage.pickOnMapCancel}
            </button>
          </div>
        )}
      </div>

      {changePlanOpen && activeNext && (
        <ChangePlanModal date={activeNext.date} routes={routes} onClose={() => setChangePlanOpen(false)} />
      )}
      {isReportModalOpen && !isPickingStationOnMap && (
        <ReportModal
          legs={reportableLegs}
          onClose={() => setIsReportModalOpen(false)}
          onSubmitted={() => {
            getRecentUserReports()
              .then(setReports)
              .catch(() => {});
          }}
          pickedStation={mapPickedStation}
          onPickedStationConsumed={() => setMapPickedStation(null)}
          onRequestPickOnMap={() => setIsPickingStationOnMap(true)}
        />
      )}
    </Shell>
  );
}
