import Link from "next/link";
import { crowdLabel, forecastForTime } from "@/lib/forecast";
import { lineById } from "@/lib/lines";
import { DAY_LABELS, type SavedRoute } from "@/lib/types";

export function RouteCard({ route }: { route: SavedRoute }) {
  const { crowdLevel } = forecastForTime(route.id, route.departureTime);
  const lineNames = route.legs.map((leg) => lineById(leg.line)?.name ?? leg.line).join(" → ");
  const transferCount = route.legs.length - 1;

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
            <span className="text-foreground/50"> ({transferCount} transfer{transferCount > 1 ? "s" : ""})</span>
          )}
        </span>
        <span className="text-xs text-foreground/50">
          {lineNames} · {route.departureTime} · {route.days.map((d) => DAY_LABELS[d]).join(", ")}
          {route.alternateLegs && <span className="text-foreground/40"> · has backup route</span>}
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
        <span className="text-xs font-medium text-foreground/70">{crowdLabel(crowdLevel)}</span>
      </div>
    </Link>
  );
}
