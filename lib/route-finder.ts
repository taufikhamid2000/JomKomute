import { LINES, lineById, stationNameOnLine } from "@/lib/lines";
import type { RouteLeg } from "@/lib/types";

// All station names across every line, deduped — for a "where are you
// going" picker that spans the whole network, unlike LegsEditor's
// per-line Combobox which only offers one line's own stations.
export function allStationNames(): string[] {
  const set = new Set<string>();
  for (const line of LINES) for (const station of line.stations) set.add(station);
  return Array.from(set).sort();
}

function linesAt(station: string) {
  return LINES.filter((l) => stationNameOnLine(station, l.id) !== undefined);
}

// The first station shared between two lines, either directly (same
// name on both) or via a WALKWAY_LINKS pair. Good enough since none of
// the 10 lines cross paths more than once in practice.
function sharedStation(lineAId: string, lineBId: string): { onA: string; onB: string } | undefined {
  const lineA = lineById(lineAId);
  if (!lineA) return undefined;
  for (const station of lineA.stations) {
    const onB = stationNameOnLine(station, lineBId);
    if (onB) return { onA: station, onB };
  }
  return undefined;
}

// BFS over the (small, ~10-node) line graph, not individual stations —
// nodes are lines, and an edge exists between two lines wherever they
// share an interchange. Minimizes transfers, not ride time: with this
// few lines a fewest-transfers path and a fastest path essentially
// never diverge enough to be worth a full time-weighted search.
export function findRoute(origin: string, destination: string): RouteLeg[] | undefined {
  if (origin === destination) return undefined;

  const originLines = linesAt(origin);
  const destLines = linesAt(destination);
  if (originLines.length === 0 || destLines.length === 0) return undefined;

  type QueueItem = { lineId: string; stationHere: string; path: RouteLeg[] };

  const queue: QueueItem[] = originLines.map((l) => ({
    lineId: l.id,
    stationHere: stationNameOnLine(origin, l.id) ?? origin,
    path: [],
  }));
  const visited = new Set(originLines.map((l) => l.id));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const destOnThisLine = stationNameOnLine(destination, current.lineId);
    if (destOnThisLine) {
      return [
        ...current.path,
        { line: current.lineId, originStation: current.stationHere, destinationStation: destOnThisLine },
      ];
    }

    for (const line of LINES) {
      if (line.id === current.lineId || visited.has(line.id)) continue;
      const shared = sharedStation(current.lineId, line.id);
      if (!shared) continue;

      visited.add(line.id);
      queue.push({
        lineId: line.id,
        stationHere: shared.onB,
        path: [
          ...current.path,
          { line: current.lineId, originStation: current.stationHere, destinationStation: shared.onA },
        ],
      });
    }
  }

  return undefined;
}
