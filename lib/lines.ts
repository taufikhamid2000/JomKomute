import { LINES, type LineId } from "@/lib/stations";

// Lines that stop at `station`, excluding `excludeLineId` — the valid
// choices for a transfer leg starting at that interchange. Empty means
// `station` isn't a real interchange (only served by the one line).
export function linesServing(station: string, excludeLineId: string) {
  return LINES.filter((l) => l.id !== excludeLineId && l.stations.some((s) => s === station));
}

export function lineById(id: string) {
  return LINES.find((l) => l.id === id);
}

export type { LineId };
export { LINES };
