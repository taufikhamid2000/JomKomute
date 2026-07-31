export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export type SavedRoute = {
  id: string;
  label: string;
  line: string;
  originStation: string;
  destinationStation: string;
  departureTime: string; // "HH:MM", 24h
  days: DayOfWeek[];
  createdAt: string; // ISO timestamp
};

export type Exception =
  | { id: string; routeId: string; type: "skip"; date: string; createdAt: string }
  | { id: string; routeId: string; type: "recurring-skip"; dayOfWeek: DayOfWeek; createdAt: string }
  | { id: string; routeId: string; type: "event"; date: string; note: string; createdAt: string };

// The built-in Omit<T, K> isn't distributive over unions — it flattens
// Exception's members down to their shared keys, which breaks the
// discriminated union at the call site (see store.ts's addException).
export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};
