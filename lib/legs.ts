import type { RouteLeg } from "@/lib/types";

export function legsComplete(legs: RouteLeg[]): boolean {
  return legs.every((l) => l.originStation && l.destinationStation);
}

// Same lines, opposite direction: reverse the leg order and swap each
// leg's origin/destination. Valid because a line (route_id in the GTFS
// feed) serves both directions — we just don't store direction-specific
// station order, only the line id.
export function reverseLegs(legs: RouteLeg[]): RouteLeg[] {
  return [...legs].reverse().map((leg) => ({
    line: leg.line,
    originStation: leg.destinationStation,
    destinationStation: leg.originStation,
  }));
}
