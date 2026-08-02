export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

// One line, boarded at one station and left at another — a journey with a
// transfer is two or more of these back to back, where each leg's
// destination is the next leg's origin (the interchange station).
export type RouteLeg = {
  line: string; // LineId, kept as a plain string so a saved route survives lib/stations.ts being regenerated
  originStation: string;
  destinationStation: string;
};

export type SavedRoute = {
  id: string;
  label: string;
  legs: RouteLeg[];
  // A fallback path for the same commute — e.g. "if the Kajang line has a
  // problem, go via Ampang and change at Chan Sow Lin instead." Same
  // departure time and days as the primary; optional.
  alternateLegs?: RouteLeg[];
  departureTime: string; // "HH:MM", 24h
  days: DayOfWeek[];
  createdAt: string; // ISO timestamp
};

// "leave" | "wfh" | "drive" is only set when the skip came from the
// dashboard's "Change plan" modal — it's applied to every saved route on
// that date (not just the one the user was looking at), since all three
// reasons replace the whole day's commute, both directions, not one leg.
export type SkipReason = "leave" | "wfh" | "drive";

export type Exception =
  | { id: string; routeId: string; type: "skip"; date: string; reason?: SkipReason; createdAt: string }
  | { id: string; routeId: string; type: "recurring-skip"; dayOfWeek: DayOfWeek; createdAt: string }
  | { id: string; routeId: string; type: "event"; date: string; note: string; createdAt: string };

// The built-in Omit<T, K> isn't distributive over unions — it flattens
// Exception's members down to their shared keys, which breaks the
// discriminated union at the call site (see store.ts's addException).
export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
