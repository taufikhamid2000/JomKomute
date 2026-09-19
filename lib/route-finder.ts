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

type PathResult = { path: NodeKey[]; dist: number };

// Dijkstra from any of `sources` (all starting at distance 0, same as the
// original single-path search) to any of `targets`, optionally skipping
// some nodes/edges entirely — the building block both the single best
// route (findRoute) and the k-shortest-paths search (findRouteOptions,
// Yen's algorithm below) share. A single-node `sources` set is exactly
// the "shortest path from this one node" search Yen's spur step needs.
function dijkstraMulti(
  graph: Map<NodeKey, Edge[]>,
  sources: Set<NodeKey>,
  targets: Set<NodeKey>,
  excludedNodes: Set<NodeKey>,
  excludedEdgeKeys: Set<string>,
): PathResult | undefined {
  const dist = new Map<NodeKey, number>();
  const prev = new Map<NodeKey, NodeKey>();
  const visited = new Set<NodeKey>();
  for (const s of sources) if (!excludedNodes.has(s)) dist.set(s, 0);

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
    if (targets.has(current)) break;

    for (const edge of graph.get(current) ?? []) {
      if (excludedNodes.has(edge.to) || visited.has(edge.to)) continue;
      if (excludedEdgeKeys.has(`${current}->${edge.to}`)) continue;
      const next = currentDist + edge.weight;
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next);
        prev.set(edge.to, current);
      }
    }
  }

  let bestNode: NodeKey | undefined;
  let bestDist = Infinity;
  for (const node of targets) {
    const d = dist.get(node);
    if (d !== undefined && d < bestDist) {
      bestDist = d;
      bestNode = node;
    }
  }
  if (bestNode === undefined) return undefined;

  const path: NodeKey[] = [bestNode];
  let cursor = bestNode;
  while (!sources.has(cursor)) {
    const p = prev.get(cursor);
    if (!p) break;
    path.unshift(p);
    cursor = p;
  }
  return { path, dist: bestDist };
}

function edgeWeight(graph: Map<NodeKey, Edge[]>, a: NodeKey, b: NodeKey): number {
  return graph.get(a)?.find((e) => e.to === b)?.weight ?? 0;
}

// Yen's k-shortest (simple) paths algorithm: start from the single best
// path, then repeatedly try detours off each node of the previously
// found path (a "spur") with the edge that path already used at that
// point blocked off, so the search is forced toward a genuinely
// different line/interchange rather than re-finding the same route. This
// is what makes the alternatives real options (different line
// combinations, different transfer points) instead of artificial
// diversity bolted on afterward — on a network with only one sane path
// between two stations, there's simply nothing shorter for it to find,
// so it naturally returns just the one.
function kShortestPaths(graph: Map<NodeKey, Edge[]>, startNodes: Set<NodeKey>, destNodes: Set<NodeKey>, k: number): PathResult[] {
  const first = dijkstraMulti(graph, startNodes, destNodes, new Set(), new Set());
  if (!first) return [];

  const A: PathResult[] = [first];
  const B: PathResult[] = [];
  const seen = new Set<string>([first.path.join(">")]);

  for (let ki = 1; ki < k; ki++) {
    const prevPath = A[ki - 1].path;
    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i];
      const rootPath = prevPath.slice(0, i + 1);
      const rootKey = rootPath.join(">");

      const excludedEdges = new Set<string>();
      for (const p of A) {
        if (p.path.length > i && p.path.slice(0, i + 1).join(">") === rootKey) {
          excludedEdges.add(`${p.path[i]}->${p.path[i + 1]}`);
        }
      }
      const excludedNodes = new Set(rootPath.slice(0, -1));

      const spurResult = dijkstraMulti(graph, new Set([spurNode]), destNodes, excludedNodes, excludedEdges);
      if (!spurResult) continue;

      let rootDist = 0;
      for (let j = 0; j < rootPath.length - 1; j++) rootDist += edgeWeight(graph, rootPath[j], rootPath[j + 1]);

      const totalPath = [...rootPath.slice(0, -1), ...spurResult.path];
      const key = totalPath.join(">");
      if (seen.has(key) || B.some((b) => b.path.join(">") === key)) continue;
      B.push({ path: totalPath, dist: rootDist + spurResult.dist });
    }

    if (B.length === 0) break;
    B.sort((a, b) => a.dist - b.dist);
    const next = B.shift()!;
    A.push(next);
    seen.add(next.path.join(">"));
  }

  return A;
}

function nodePathToLegs(nodePath: NodeKey[]): RouteLeg[] {
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

export type RouteOption = {
  legs: RouteLeg[];
  totalMinutes: number;
  transfers: number;
  stationCount: number;
};

function startDestNodes(origin: string, destination: string) {
  const originLines = linesAt(origin);
  const destLines = linesAt(destination);
  if (originLines.length === 0 || destLines.length === 0) return undefined;
  return {
    startNodes: new Set(originLines.map((l) => nodeKey(l.id, stationNameOnLine(origin, l.id)!))),
    destNodes: new Set(destLines.map((l) => nodeKey(l.id, stationNameOnLine(destination, l.id)!))),
  };
}

// Up to `maxOptions` reasonable alternative routes (fewest-time first,
// then whatever the next-best genuinely different detour is) — see
// kShortestPaths above for how "genuinely different" is enforced.
// Options with identical leg sequences (same lines, same boarding/exit
// stations) are deduped, since two distinct node-paths can occasionally
// collapse to the same rider-visible route.
export function findRouteOptions(origin: string, destination: string, maxOptions = 3): RouteOption[] | undefined {
  if (origin === destination) return undefined;
  const nodes = startDestNodes(origin, destination);
  if (!nodes) return undefined;

  const graph = getGraph();
  const paths = kShortestPaths(graph, nodes.startNodes, nodes.destNodes, maxOptions);
  if (paths.length === 0) return undefined;

  const options: RouteOption[] = [];
  const seenLegs = new Set<string>();
  for (const p of paths) {
    const legs = nodePathToLegs(p.path);
    const legKey = JSON.stringify(legs);
    if (seenLegs.has(legKey)) continue;
    seenLegs.add(legKey);
    options.push({ legs, totalMinutes: p.dist, transfers: legs.length - 1, stationCount: p.path.length });
  }
  return options.length > 0 ? options : undefined;
}

export function findRoute(origin: string, destination: string): RouteLeg[] | undefined {
  return findRouteOptions(origin, destination, 1)?.[0]?.legs;
}
