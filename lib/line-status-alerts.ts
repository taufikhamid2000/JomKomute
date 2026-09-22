"use client";

// Client-only fallback for "tell me when a followed line's status
// changes" that needs no server infrastructure at all — no cron, no
// push subscriptions, no VAPID keys. It only catches a transition the
// moment the app is actually open (unlike lib/push-notifications.ts's
// Web Push path, which can reach a device with the app closed, but
// currently needs Vercel Cron running often enough to notice — see
// that file's header). Same "only alert on an actual transition, not
// every time the line is still reported" rule as
// app/api/push/check/route.ts's jomkomute.line_status_notified, just
// kept in localStorage instead of the database since there's no
// server round trip here at all.

const STORAGE_KEY = "jomkomute:line-status-alerts-seen";

type Level = "normal" | "reported";
type LevelMap = Record<string, Level>;

function readSeen(): LevelMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as LevelMap;
  } catch {
    return {};
  }
}

export type LineStatusTransition = { lineId: string; level: Level };

// Compares `currentLevels` (every line's status right now — see
// lib/line-status.ts's lineStatusesByLine, keyed by lineId, missing
// entries mean "normal") against what was last recorded, for followed
// lines only, and immediately persists the new levels — so calling
// this twice in a row with the same input returns [] the second time,
// same idempotency the DB-backed version has. Call it whenever the
// home screen's reports refresh (app/page.tsx), not just once on
// mount, so a transition that happens while the app is already open
// still surfaces on the next refresh.
export function detectFollowedLineTransitions(
  currentLevels: Map<string, Level>,
  followedLineIds: Set<string>,
): LineStatusTransition[] {
  if (typeof window === "undefined" || followedLineIds.size === 0) return [];

  const seen = readSeen();
  const transitions: LineStatusTransition[] = [];
  const next: LevelMap = { ...seen };

  for (const lineId of followedLineIds) {
    const level = currentLevels.get(lineId) ?? "normal";
    const previous = seen[lineId] ?? "normal";
    if (level !== previous) transitions.push({ lineId, level });
    next[lineId] = level;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return transitions;
}
