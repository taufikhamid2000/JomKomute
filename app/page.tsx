"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { RouteCard } from "@/components/route-card";
import { Shell } from "@/components/shell";
import { useSavedRoutes } from "@/lib/store";

export default function RoutesPage() {
  const { routes } = useSavedRoutes();

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Your routes</h1>
          {routes.length > 0 && (
            <Link
              href="/new"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Add route
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
    </Shell>
  );
}
