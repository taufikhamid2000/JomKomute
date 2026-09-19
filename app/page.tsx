"use client";

// Waze-style map-first home screen: a full-screen map with a bottom panel
// for "Where to?", Home/Work quick access, and the saved-routes list. The
// old "all my saved routes" list that used to live here now lives at
// app/routes/page.tsx (reachable via the sidebar's "Routes" link).

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { useSavedRoutes } from "@/lib/store";
import type { SavedRoute } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";

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

  const homeRoute = routes.find((r) => r.isHome);
  const workRoute = routes.find((r) => r.isWork);
  const recent = [...routes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <Shell>
      <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <HomeMap legs={activeRoute?.legs ?? homeRoute?.legs} />

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
              onClick={() => setActiveRoute(null)}
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
            <Link
              href="/new"
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-foreground/50">
                <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.75" />
                <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              {t.homePage.whereTo}
            </Link>

            {homeRoute || workRoute ? (
              <div className="flex gap-2">
                {homeRoute ? (
                  <QuickAccessCard label={t.homePage.homeQuickAccess} route={homeRoute} onSelect={setActiveRoute} />
                ) : (
                  <Link
                    href="/new"
                    className="flex min-w-[9rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border p-3 text-center text-xs text-foreground/50 transition-colors hover:border-primary/40"
                  >
                    {t.homePage.setHomePrompt}
                  </Link>
                )}
                {workRoute ? (
                  <QuickAccessCard label={t.homePage.workQuickAccess} route={workRoute} onSelect={setActiveRoute} />
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
                      onClick={() => setActiveRoute(route)}
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
