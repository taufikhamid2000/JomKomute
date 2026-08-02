import { LINES, type LineId } from "@/lib/stations";

// Stations that go by different names on different lines but are still a
// real transfer point — connected by a walkway rather than sharing a
// GTFS stop, so an exact-name match alone misses them. Not present in
// the GTFS feed; confirmed via RapidKL/news coverage instead:
// Glenmarie (Kelana Jaya Line) <-> Glenmarie 2 (Shah Alam Line), ~230m
// apart, linked by a covered elevated walkway connecting both stations'
// Entrance A.
const WALKWAY_LINKS: Record<string, string> = {
  Glenmarie: "Glenmarie 2",
  "Glenmarie 2": "Glenmarie",
};

// The name `station` goes by on `lineId` — itself if that line stops
// there directly, its walkway-linked counterpart if that's what the line
// actually calls it, or undefined if the line doesn't reach it at all.
export function stationNameOnLine(station: string, lineId: string): string | undefined {
  const line = LINES.find((l) => l.id === lineId);
  if (!line) return undefined;
  if (line.stations.some((s) => s === station)) return station;
  const alias = WALKWAY_LINKS[station];
  if (alias && line.stations.some((s) => s === alias)) return alias;
  return undefined;
}

// Lines that stop at `station` (or reach it via a walkway-linked
// counterpart), excluding `excludeLineId` — the valid choices for a
// transfer leg starting at that interchange. Empty means `station` isn't
// a real interchange (only served by the one line).
export function linesServing(station: string, excludeLineId: string) {
  return LINES.filter((l) => l.id !== excludeLineId && stationNameOnLine(station, l.id) !== undefined);
}

export function lineById(id: string) {
  return LINES.find((l) => l.id === id);
}

export type { LineId };
export { LINES };
