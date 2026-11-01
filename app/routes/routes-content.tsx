"use client";

// The full "all my saved routes" list — this used to live at app/page.tsx
// (the app's root) but the root is now a map-first Waze-style home screen
// (see app/page.tsx). This page keeps the old list functionality reachable
// via the sidebar's "Routes" nav link (components/shell.tsx).

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { RouteCard } from "@/components/route-card";
import { AppShell } from "@/components/app-shell";
import { useSavedRoutes } from "@/lib/store";
import { useDictionary } from "@/lib/use-dictionary";

export function RoutesContent() {
  const { t } = useDictionary();
  const { routes } = useSavedRoutes();

  return (
    <AppShell title={t.routesPage.title} width="xl">
      <div className="animate-page-in flex w-full flex-col gap-4">
        <div className="flex items-center justify-end">
          {routes.length > 0 && (
            <Link
              href="/new"
              className="flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t.routesPage.addRoute}
            </Link>
          )}
        </div>

        {routes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
