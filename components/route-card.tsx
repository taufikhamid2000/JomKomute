"use client";

import Link from "next/link";
import { crowdLevelKey, forecastForTime } from "@/lib/forecast";
import { lineById } from "@/lib/lines";
import { estimatedArrival } from "@/lib/schedule";
import type { SavedRoute } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";

export function RouteCard({ route }: { route: SavedRoute }) {
  const { t } = useDictionary();
  const { crowdLevel } = forecastForTime(route.id, route.departureTime);
  const lineNames = route.legs.map((leg) => lineById(leg.line)?.name ?? leg.line).join(" → ");
  const transferCount = route.legs.length - 1;
  const arrival = estimatedArrival(route.departureTime, route.legs);

  return (
    <Link
      href={`/route?id=${route.id}`}
      className="animate-row-in flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-foreground">{route.label}</span>
        <span className="text-sm text-foreground/70">
          {route.legs[0].originStation} <span aria-hidden="true">→</span>{" "}
          {route.legs[route.legs.length - 1].destinationStation}
          {transferCount > 0 && (
            <span className="text-foreground/50"> ({t.routesPage.transfer(transferCount)})</span>
          )}
        </span>
        <span className="text-xs text-foreground/50">
          {lineNames} · {route.departureTime}
          {arrival && `–${arrival}`} · {route.days.map((d) => t.days[d]).join(", ")}
          {route.alternateLegs && <span className="text-foreground/40"> · {t.routesPage.hasBackup}</span>}
        </span>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: crowdLevel >= 70 ? "var(--destructive)" : crowdLevel >= 40 ? "#d97706" : "var(--accent)",
          }}
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-foreground/70">{t.forecast[crowdLevelKey(crowdLevel)]}</span>
      </div>
    </Link>
  );
}
