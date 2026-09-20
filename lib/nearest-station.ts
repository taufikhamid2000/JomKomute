// Snaps an arbitrary tapped point to the nearest station in a given list
// — shared by every "tap the map to pick a station" interaction
// (components/home-map.tsx's pickableStations mode) so they all resolve
// taps the same way.

import { distanceMeters } from "@/lib/geo-distance";

export function nearestStationTo(
  point: { lat: number; lng: number },
  stations: { name: string; coord: [number, number] }[],
): string | null {
  let best: { name: string; d: number } | null = null;
  for (const s of stations) {
    const d = distanceMeters(point, { lat: s.coord[0], lng: s.coord[1] });
    if (!best || d < best.d) best = { name: s.name, d };
  }
  return best?.name ?? null;
}
