// The full rail network as drawable polyline segments, shared by every
// Leaflet map that wants the whole system faintly visible underneath
// whatever it's actually highlighting (a route, report clusters, etc.) —
// originally lived only in components/home-map.tsx; pulled out here once
// components/report-map.tsx needed the same lines (its "browse all
// reports" map used to show just tile+dots with no rail context at all).
//
// Every consecutive pair of stations on each line that both have real
// coordinates in STATION_COORDS, split into separate segments at any gap
// (a station missing from STATION_COORDS) rather than skipping straight
// across it — same "don't draw a fake straight line over a missing stop"
// rule lib/route-corridor.ts's stationsForLeg follows for a single route.
// Computed once (LINES/STATION_COORDS are both static, module-level data)
// and reused across renders instead of every render.

import { LINES, STATION_COORDS } from "@/lib/stations";

export type NetworkSegment = { color: string; points: [number, number][] };

function buildNetworkSegments(): NetworkSegment[] {
  const segments: NetworkSegment[] = [];
  for (const line of LINES) {
    let current: [number, number][] = [];
    for (const station of line.stations) {
      const coord = STATION_COORDS[station as string];
      if (!coord) {
        if (current.length > 1) segments.push({ color: line.color, points: current });
        current = [];
        continue;
      }
      current.push(coord);
    }
    if (current.length > 1) segments.push({ color: line.color, points: current });
  }
  return segments;
}

export const NETWORK_SEGMENTS = buildNetworkSegments();
