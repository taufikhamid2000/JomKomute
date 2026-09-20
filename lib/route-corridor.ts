// Turns a route's legs into a flat list of points along its line(s), each
// tagged with which line it belongs to — the shared geometry behind
// Phase 3 of the reporting plan: scoping app/report/page.tsx's tap-to-
// report map to the route the rider is actually on, instead of anywhere
// on the whole network (see components/home-map.tsx's stationsForLeg,
// which this mirrors — kept as a separate small copy rather than
// exporting from that file, since home-map.tsx is a "use client" React
// component file and this needs to stay a plain importable util usable
// from app/report/page.tsx without dragging Leaflet/react-leaflet in).

import { distanceMeters } from "@/lib/geo-distance";
import { lineById } from "@/lib/lines";
import { STATION_COORDS } from "@/lib/stations";
import type { RouteLeg } from "@/lib/types";

export type CorridorPoint = { coord: [number, number]; lineId: string; name: string };

function stationsForLeg(leg: RouteLeg): string[] {
  const line = lineById(leg.line);
  if (!line) return [leg.originStation, leg.destinationStation];

  const stations = line.stations as readonly string[];
  const originIdx = stations.indexOf(leg.originStation);
  const destIdx = stations.indexOf(leg.destinationStation);
  if (originIdx === -1 || destIdx === -1) return [leg.originStation, leg.destinationStation];

  const slice =
    originIdx <= destIdx
      ? stations.slice(originIdx, destIdx + 1)
      : stations.slice(destIdx, originIdx + 1).reverse();
  return [...slice];
}

// Stations missing from STATION_COORDS are silently skipped, same "don't
// draw/check something we don't have coordinates for" rule
// components/home-map.tsx follows throughout.
export function routeCorridorPoints(legs: RouteLeg[]): CorridorPoint[] {
  return legs.flatMap((leg) =>
    stationsForLeg(leg)
      .map((name) => ({ name, coord: STATION_COORDS[name] }))
      .filter((s): s is { name: string; coord: [number, number] } => !!s.coord)
      .map((s) => ({ coord: s.coord, lineId: leg.line, name: s.name })),
  );
}

// Just the station names along a route, in order, deduped — what a
// station-picker (components/report-modal.tsx) offers when reporting is
// scoped to a route, instead of the full ~190-station list.
export function routeCorridorStationNames(legs: RouteLeg[]): string[] {
  return Array.from(new Set(routeCorridorPoints(legs).map((p) => p.name)));
}

export const REPORT_CORRIDOR_METERS = 300;

// The closest corridor point to `point`, and how far it is — used both to
// gate submission (app/report/page.tsx: reject a tap further than
// REPORT_CORRIDOR_METERS from the route) and to tag which line a report
// belongs to (lib/user-reports-client.ts's lineId). A coarse per-point
// check against station coordinates (no segment interpolation) — same
// "good enough for station-spaced rail geometry" tradeoff
// components/home-map.tsx's isNearRoute makes.
export function nearestCorridorPoint(
  point: { lat: number; lng: number },
  corridor: CorridorPoint[],
): { point: CorridorPoint; distanceMeters: number } | null {
  let best: { point: CorridorPoint; distanceMeters: number } | null = null;
  for (const candidate of corridor) {
    const d = distanceMeters(point, { lat: candidate.coord[0], lng: candidate.coord[1] });
    if (!best || d < best.distanceMeters) best = { point: candidate, distanceMeters: d };
  }
  return best;
}
