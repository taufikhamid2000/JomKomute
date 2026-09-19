"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ExceptionPanel } from "@/components/exception-panel";
import { ForecastBars } from "@/components/forecast-bars";
import { LegSummary } from "@/components/leg-summary";
import { Shell } from "@/components/shell";
import { crowdLevelKey, forecastEntryForTime, useForecast } from "@/lib/forecast";
import { findRouteOptions } from "@/lib/route-finder";
import { estimatedArrival, legArrivalTimes } from "@/lib/schedule";
import { useSavedRoutes } from "@/lib/store";
import { useDictionary } from "@/lib/use-dictionary";

// A single static page (not a dynamic [id] segment) — the route's id is
// read from ?id= at runtime instead of being baked in at build time, since
// static export can't pre-render pages for ids that don't exist yet.
export default function RouteDetailPage() {
  return (
    <Shell>
      <Suspense fallback={null}>
        <RouteDetail />
      </Suspense>
    </Shell>
  );
}

function RouteDetail() {
  const { t } = useDictionary();
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { routes, removeRoute, setHomeRoute, clearHomeRoute, setWorkRoute, clearWorkRoute } = useSavedRoutes();
  const route = routes.find((r) => r.id === id);
  // Set right before removeRoute + router.push in handleDelete — removing
  // the route triggers a synchronous re-render (useSyncExternalStore) that
  // lands before the navigation away completes, so without this guard the
  // "not found" fallback below flashes for a frame on every delete.
  const [isDeleting, setIsDeleting] = useState(false);

  // Today's date: pings are per specific date, so "today" is the best
  // real signal available to upgrade this weekly-recurring route's
  // synthetic curve (see components/route-card.tsx's same choice).
  const today = new Date().toISOString().slice(0, 10);
  // Legs (and a free "backup route" via the 2nd option) are computed live
  // from origin/destination rather than stored — see lib/types.ts's
  // SavedRoute for why. findRouteOptions is deterministic, so the same
  // options are recomputed for the same route.id/origin/destination on
  // every render; useMemo just avoids redoing the Dijkstra search on
  // renders that don't change those.
  const routeOptions = useMemo(
    () => (route ? findRouteOptions(route.originStation, route.destinationStation) : undefined),
    // routes.find() above returns a fresh object each render — depend on
    // the two fields that actually determine the search, not the object
    // reference, so this doesn't redo the Dijkstra search every render.
    [route?.originStation, route?.destinationStation],
  );
  const legs = routeOptions?.[0]?.legs;
  const alternateLegs = routeOptions?.[1]?.legs;
  // useForecast must run on every render regardless of whether `route` is
  // defined yet (rules of hooks) — it briefly goes undefined during
  // hydration and right after a delete, so this falls back to placeholder
  // args rather than being called from inside the `if (!route)` branch
  // below, which previously threw "Rendered fewer hooks than expected."
  const forecast = useForecast(route?.id ?? "", route?.originStation ?? "", today);

  // Renders once with an empty snapshot during hydration (localStorage isn't
  // read server-side), then useSyncExternalStore corrects it on the client
  // — so this is a plain fallback, not a hard 404, to give that a chance to land.
  if (!route) {
    if (isDeleting) return null;
    return (
      <div className="animate-page-in mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 md:p-8">
        <p className="text-sm text-foreground/60">{t.routeDetail.notFound}</p>
        <Link href="/routes" className="w-fit text-sm text-primary underline-offset-4 hover:underline">
          {t.routeDetail.backToRoutes}
        </Link>
      </div>
    );
  }

  const { hour, crowdLevel } = forecastEntryForTime(forecast, route.departureTime);
  const arrival = legs ? estimatedArrival(route.departureTime, legs) : undefined;
  const legArrivals = legs ? legArrivalTimes(route.departureTime, legs) : undefined;
  const alternateArrivals = alternateLegs ? legArrivalTimes(route.departureTime, alternateLegs) : undefined;

  function handleDelete() {
    if (!route) return;
    setIsDeleting(true);
    removeRoute(route.id);
    router.push("/routes");
  }

  return (
    <div className="animate-page-in mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-foreground">{route.label}</h1>
            <p className="text-xs text-foreground/50">
              {route.departureTime}
              {arrival && ` · ${t.routeDetail.expectedArrival(arrival)}`} ·{" "}
              {route.days.map((d) => t.days[d]).join(", ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => (route.isHome ? clearHomeRoute(route.id) : setHomeRoute(route.id))}
              className={
                route.isHome
                  ? "whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  : "whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              }
            >
              {route.isHome ? `★ ${t.routeDetail.isHome}` : t.routeDetail.setHome}
            </button>
            <button
              type="button"
              onClick={() => (route.isWork ? clearWorkRoute(route.id) : setWorkRoute(route.id))}
              className={
                route.isWork
                  ? "whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  : "whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              }
            >
              {route.isWork ? `★ ${t.routeDetail.isWork}` : t.routeDetail.setWork}
            </button>
            <Link
              href={`/new?reverseOf=${route.id}`}
              className="whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t.routeDetail.addReturnTrip}
            </Link>
          </div>
        </div>
        {legs && <LegSummary legs={legs} arrivalTimes={legArrivals} />}
      </div>

      {alternateLegs && (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-3">
          <p className="text-xs font-medium text-foreground/50">{t.routeDetail.backupRoute}</p>
          <LegSummary legs={alternateLegs} arrivalTimes={alternateArrivals} />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{t.routeDetail.crowdingTitle}</p>
          <span className="text-xs font-medium text-foreground/60">
            {t.routeDetail.crowdingAt(route.departureTime, t.forecast[crowdLevelKey(crowdLevel)], crowdLevel)}
          </span>
        </div>
        <ForecastBars data={forecast} highlightHour={hour} />
        <p className="text-xs text-foreground/40">{t.routeDetail.crowdingNote}</p>
      </div>

      <ExceptionPanel routeId={route.id} routeDays={route.days} />

      <button
        type="button"
        onClick={handleDelete}
        className="w-fit cursor-pointer text-xs text-foreground/40 underline-offset-4 hover:text-destructive hover:underline"
      >
        {t.routeDetail.delete}
      </button>
    </div>
  );
}
