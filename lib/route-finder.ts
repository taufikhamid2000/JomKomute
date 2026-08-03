import { LINES, stationNameOnLine } from "@/lib/lines";
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

type NodeKey = string; // `${lineId}::${station}` — a station only as it exists on one specific line

function nodeKey(lineId: string, station: string): NodeKey {
  return `${lineId}::${station}`;
}

// Flat cost, in the same "minutes" unit as ride time, standing in for a
// transfer — no official per-interchange walk-time data exists (see
// lib/schedule.ts's TRANSFER_BUFFER_MINUTES, which makes the same call),
// so one estimate has to stand in for all of them.
const TRANSFER_MINUTES = 5;

type Edge = { to: NodeKey; weight: number };

// A node per (line, station) pair rather than per physical station,
// connected by ride edges (real scheduled travel time between adjacent
// stops on the same line) and transfer edges (a flat cost, wherever two
// lines share a station directly or via a WALKWAY_LINKS pair). Built
// once and cached — it doesn't depend on any particular search.
function buildGraph(): Map<NodeKey, Edge[]> {
  const graph = new Map<NodeKey, Edge[]>();

  function addEdge(a: NodeKey, b: NodeKey, weight: number) {
    if (!graph.has(a)) graph.set(a, []);
    graph.get(a)!.push({ to: b, weight });
  }

  for (const line of LINES) {
    for (let i = 0; i < line.stations.length - 1; i++) {
      const a = nodeKey(line.id, line.stations[i]);
      const b = nodeKey(line.id, line.stations[i + 1]);
      const weight = Math.max(1, Math.abs(line.arrivalOffsetMinutes[i + 1] - line.arrivalOffsetMinutes[i]));
      addEdge(a, b, weight);
      addEdge(b, a, weight);
    }

    for (const station of line.stations) {
      for (const other of LINES) {
        if (other.id === line.id) continue;
        const onOther = stationNameOnLine(station, other.id);
        if (!onOther) continue;
        addEdge(nodeKey(line.id, station), nodeKey(other.id, onOther), TRANSFER_MINUTES);
      }
    }
  }

  return graph;
}

let cachedGraph: Map<NodeKey, Edge[]> | undefined;
function getGraph(): Map<NodeKey, Edge[]> {
  if (!cachedGraph) cachedGraph = buildGraph();
  return cachedGraph;
}

// Dijkstra's shortest path by real scheduled travel time (see
// lib/stations.ts's arrivalOffsetMinutes), not "fewest transfers" — an
// earlier version searched line-to-line and picked whichever interchange
// was nearest by stop count, which broke on lines that cross paths more
// than once. Sri Petaling and Kelana Jaya share both Putra Heights (the
// southern terminus) and Masjid Jamek (near the city centre); "nearest
// by stop count" sent Awan Besar -> Ampang Park via Putra Heights —
// riding away from the destination first — instead of Masjid Jamek. A
// real weighted shortest path can't make that mistake, since the
// terminus route is simply longer in total travel time.
export function findRoute(origin: string, destination: string): RouteLeg[] | undefined {
  if (origin === destination) return undefined;

  const originLines = linesAt(origin);
  const destLines = linesAt(destination);
  if (originLines.length === 0 || destLines.length === 0) return undefined;

  const graph = getGraph();
  const startNodes = new Set(originLines.map((l) => nodeKey(l.id, stationNameOnLine(origin, l.id)!)));
  const destNodes = new Set(destLines.map((l) => nodeKey(l.id, stationNameOnLine(destination, l.id)!)));

  const dist = new Map<NodeKey, number>();
  const prev = new Map<NodeKey, NodeKey>();
  const visited = new Set<NodeKey>();
  for (const s of startNodes) dist.set(s, 0);

  while (true) {
    let current: NodeKey | undefined;
    let currentDist = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < currentDist) {
        current = node;
        currentDist = d;
      }
    }
    if (current === undefined) break;
    visited.add(current);
    if (destNodes.has(current)) break;

    for (const edge of graph.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      const next = currentDist + edge.weight;
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next);
        prev.set(edge.to, current);
      }
    }
  }

  let bestDestNode: NodeKey | undefined;
  let bestDist = Infinity;
  for (const node of destNodes) {
    const d = dist.get(node);
    if (d !== undefined && d < bestDist) {
      bestDist = d;
      bestDestNode = node;
    }
  }
  if (bestDestNode === undefined) return undefined;

  const nodePath: NodeKey[] = [bestDestNode];
  let cursor = bestDestNode;
  while (!startNodes.has(cursor)) {
    const p = prev.get(cursor);
    if (!p) break;
    nodePath.unshift(p);
    cursor = p;
  }

  const stops = nodePath.map((key) => {
    const [lineId, station] = key.split("::");
    return { lineId, station };
  });

  const legs: RouteLeg[] = [];
  let legStart = stops[0];
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].lineId !== legStart.lineId) {
      legs.push({ line: legStart.lineId, originStation: legStart.station, destinationStation: stops[i - 1].station });
      legStart = stops[i];
    }
  }
  legs.push({ line: legStart.lineId, originStation: legStart.station, destinationStation: stops[stops.length - 1].station });

  return legs;
}
