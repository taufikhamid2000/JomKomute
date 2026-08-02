import { LINES, type LineId } from "@/lib/stations";

// Stations that go by different names on different lines but are still a
// real transfer point — connected by a walkway rather than sharing a
// GTFS stop, so an exact-name match alone misses them. Not present in
// the GTFS feed; confirmed via RapidKL/news coverage instead. This app
// has no concept of fare, so paid-to-paid (seamless) and out-of-station
// (exit + pay again) transfers are treated the same here — noted per
// entry for whenever that distinction starts to matter:
//   - Glenmarie (Kelana Jaya) <-> Glenmarie 2 (Shah Alam): ~230m,
//     covered elevated walkway linking both stations' Entrance A.
//   - USJ 7 (Kelana Jaya) <-> USJ7 (BRT Sunway): ~50m — actually one
//     integrated station built together with a shared paid zone; the
//     differing spelling is just each line's own naming, not two places.
//   - Plaza Rakyat (Ampang/Sri Petaling) <-> Merdeka (MRT Kajang):
//     official interchange since 2017, 180m paid-to-paid walkway.
//   - Dang Wangi (Kelana Jaya) <-> Bukit Nanas (Monorail): ~300m
//     covered walkway, but OUT-OF-STATION — exit, walk, and pay a
//     second fare to re-enter (unlike the three above).
const WALKWAY_LINKS: Record<string, string> = {
  Glenmarie: "Glenmarie 2",
  "Glenmarie 2": "Glenmarie",
  "USJ 7": "USJ7",
  USJ7: "USJ 7",
  "Plaza Rakyat": "Merdeka",
  Merdeka: "Plaza Rakyat",
  "Dang Wangi": "Bukit Nanas",
  "Bukit Nanas": "Dang Wangi",
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
