"use client";

// The full "all my saved routes" list — this used to live at app/page.tsx
// (the app's root) but the root is now a map-first Waze-style home screen
// (see app/page.tsx). This page keeps the old list functionality reachable
// via the sidebar's "Routes" nav link (components/shell.tsx).

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { EmptyState } from "@/components/empty-state";
import { RouteCard } from "@/components/route-card";
import { Shell } from "@/components/shell";
import { useSavedRoutes } from "@/lib/store";
import { useDictionary } from "@/lib/use-dictionary";

// react-leaflet touches window/document at module load — dynamic-import
// with ssr:false, same pattern as app/page.tsx's HomeMap.
const HomeMap = dynamic(() => import("@/components/home-map").then((m) => m.HomeMap), { ssr: false });

export function RoutesContent() {
  const { t } = useDictionary();
  const { routes } = useSavedRoutes();

  // Origin/destination pins for every saved route, for the overview
  // mini-map below — text-only was the one thing flagged about this page,
  // and a map earns its place here since it's the one spot a rider can see
  // all their commutes at once, geographically.
  const routePins = useMemo(
    () => routes.map((route) => ({ originStation: route.originStation, destinationStation: route.destinationStation })),
    [routes],
  );

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">{t.routesPage.title}</h1>
          {routes.length > 0 && (
            <Link
              href="/new"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t.routesPage.addRoute}
            </Link>
          )}
        </div>

        {routes.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="h-48 w-full overflow-hidden rounded-2xl border border-border">
              <HomeMap routePins={routePins} />
            </div>
            <div className="flex flex-col gap-3">
              {routes.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
