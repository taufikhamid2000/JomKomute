import type { DayOfWeek, Exception, SavedRoute } from "@/lib/types";

export type NextRoute = {
  route: SavedRoute;
  date: string; // ISO yyyy-mm-dd, local
  departureAt: Date;
};

function dateIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSkipped(routeId: string, iso: string, dow: DayOfWeek, exceptions: Exception[]): boolean {
  return exceptions.some(
    (e) =>
      e.routeId === routeId &&
      ((e.type === "skip" && e.date === iso) || (e.type === "recurring-skip" && e.dayOfWeek === dow))
  );
}

// Earliest future occurrence across every saved route, skipping days the
// route doesn't run, recurring days off, and one-off skip exceptions
// (including the whole-day ones the "Change plan" modal adds). Looks up
// to two weeks ahead so a route that only runs, say, Fridays still surfaces.
export function computeNextRoute(routes: SavedRoute[], exceptions: Exception[], now: Date = new Date()): NextRoute | null {
  let best: NextRoute | null = null;

  for (const route of routes) {
    for (let offset = 0; offset < 14; offset++) {
      const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const dow = candidate.getDay() as DayOfWeek;
      if (!route.days.includes(dow)) continue;

      const iso = dateIso(candidate);
      if (isSkipped(route.id, iso, dow, exceptions)) continue;

      const [h, m] = route.departureTime.split(":").map(Number);
      const departureAt = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), h, m, 0, 0);
      if (departureAt <= now) continue;

      if (!best || departureAt < best.departureAt) {
        best = { route, date: iso, departureAt };
      }
      break;
    }
  }

  return best;
}
