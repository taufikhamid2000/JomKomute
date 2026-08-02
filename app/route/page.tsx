"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ExceptionPanel } from "@/components/exception-panel";
import { ForecastBars } from "@/components/forecast-bars";
import { LegSummary } from "@/components/leg-summary";
import { Shell } from "@/components/shell";
import { crowdLabel, forecastForTime } from "@/lib/forecast";
import { useSavedRoutes } from "@/lib/store";
import { DAY_LABELS } from "@/lib/types";

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
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { routes, removeRoute } = useSavedRoutes();
  const route = routes.find((r) => r.id === id);

  // Renders once with an empty snapshot during hydration (localStorage isn't
  // read server-side), then useSyncExternalStore corrects it on the client
  // — so this is a plain fallback, not a hard 404, to give that a chance to land.
  if (!route) {
    return (
      <div className="animate-page-in mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 md:p-8">
        <p className="text-sm text-foreground/60">Route not found.</p>
        <Link href="/" className="w-fit text-sm text-primary underline-offset-4 hover:underline">
          Back to your routes
        </Link>
      </div>
    );
  }

  const { hour, crowdLevel } = forecastForTime(route.id, route.departureTime);

  function handleDelete() {
    if (!route) return;
    removeRoute(route.id);
    router.push("/");
  }

  return (
    <div className="animate-page-in mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-foreground">{route.label}</h1>
            <p className="text-xs text-foreground/50">
              {route.departureTime} · {route.days.map((d) => DAY_LABELS[d]).join(", ")}
            </p>
          </div>
          <Link
            href={`/new?reverseOf=${route.id}`}
            className="shrink-0 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Add return trip
          </Link>
        </div>
        <LegSummary legs={route.legs} />
      </div>

      {route.alternateLegs && (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-3">
          <p className="text-xs font-medium text-foreground/50">Backup route</p>
          <LegSummary legs={route.alternateLegs} />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Typical crowding by hour</p>
          <span className="text-xs font-medium text-foreground/60">
            At {route.departureTime}: {crowdLabel(crowdLevel)} ({crowdLevel}%)
          </span>
        </div>
        <ForecastBars routeId={route.id} highlightHour={hour} />
        <p className="text-xs text-foreground/40">
          Placeholder model based on typical rush-hour patterns — not yet backed by real ridership data.
        </p>
      </div>

      <ExceptionPanel routeId={route.id} routeDays={route.days} />

      <button
        type="button"
        onClick={handleDelete}
        className="w-fit cursor-pointer text-xs text-foreground/40 underline-offset-4 hover:text-destructive hover:underline"
      >
        Delete this route
      </button>
    </div>
  );
}
