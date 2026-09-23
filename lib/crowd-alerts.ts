"use client";

// Client-only "was today's ping count exceptionally high" check, same
// no-backend idempotency pattern as lib/line-status-alerts.ts: recorded in
// localStorage per routeId+date so the boot-time alert fires once per
// route per day, not on every ping-count poll while the app stays open.
//
// Only meant to be called with a real (non-suppressed) count from
// lib/pings-client.ts's getPingCounts — never the lib/crowd-mock.ts
// fallback, so this never alerts on made-up numbers.

const STORAGE_KEY = "jomkomute:crowd-alerts-seen";

// Above lib/crowd-mock.ts's existing "busier than usual" threshold (150)
// — that one already nudges toward the alternate line in the route panel,
// so this boot-time alert is reserved for a clearly bigger crowd, closer
// to lib/forecast.ts's PING_SATURATION_COUNT (250).
export const EXCEPTIONAL_CROWD_THRESHOLD = 220;

function readSeen(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, true>;
  } catch {
    return {};
  }
}

// True only the first time routeId+date is checked — every later call
// (e.g. the next ping-count poll while the app is still open) returns
// false so the rider isn't shown the same alert again after dismissing it.
export function isNewExceptionalCrowd(routeId: string, date: string): boolean {
  if (typeof window === "undefined") return false;
  const seen = readSeen();
  const key = `${routeId}|${date}`;
  if (seen[key]) return false;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...seen, [key]: true }));
  return true;
}
