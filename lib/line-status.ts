// Crowdsourced per-line status derived from recent visible user reports
// (see lib/user-reports-client.ts's getRecentUserReports(), which already
// reads from jomkomute_user_reports_visible — 24h RLS window plus
// dispute-voting applied). This narrows further to a short "right now"
// window and aggregates by line_id for app/operating-hours/page.tsx's
// per-line status badge.

import { linesForStation } from "@/lib/lines";
import type { ReportCategory, UserReport } from "@/lib/user-reports-client";

// How far back a report still counts toward "current" status — reports
// older than this are stale for a live indicator even though they're
// still within the 24h visibility window used elsewhere (e.g. the map).
export const STATUS_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Worst-first severity ordering used to pick which category headlines a
// line's status when multiple kinds of reports came in — a breakdown or
// accident is more disruptive than a delay, which is more disruptive
// than crowding or an unspecified "other" report.
const SEVERITY_ORDER: ReportCategory[] = ["breakdown", "accident", "delay", "crowded", "other"];

export type LineStatus = {
  level: "normal" | "reported";
  count: number;
  worstCategory: ReportCategory | null;
};

const NORMAL_STATUS: LineStatus = { level: "normal", count: 0, worstCategory: null };

// Recent (within STATUS_WINDOW_MS of `now`) reports scoped to `lineId` —
// pass the result to lineStatusFor per line rather than re-filtering the
// full report list once per line.
export function recentReportsForLine(reports: UserReport[], lineId: string, now: Date = new Date()): UserReport[] {
  const cutoff = now.getTime() - STATUS_WINDOW_MS;
  return reports.filter((r) => r.lineId === lineId && new Date(r.createdAt).getTime() >= cutoff);
}

// Aggregates a line's recent reports into a simple status summary. Empty
// input (or all-stale) reads as "normal" — the vast majority of lines
// most of the time, given real-world report volume.
export function lineStatusFor(recentLineReports: UserReport[]): LineStatus {
  if (recentLineReports.length === 0) return NORMAL_STATUS;

  let worstCategory: ReportCategory = recentLineReports[0].category;
  let worstRank = SEVERITY_ORDER.indexOf(worstCategory);
  for (const report of recentLineReports) {
    const rank = SEVERITY_ORDER.indexOf(report.category);
    if (rank !== -1 && (worstRank === -1 || rank < worstRank)) {
      worstRank = rank;
      worstCategory = report.category;
    }
  }

  return { level: "reported", count: recentLineReports.length, worstCategory };
}

// A single station's status — the worst status across every line that
// serves it (a station on two lines is "reported" if either one is),
// used by the station info popup (components/station-popup.tsx) rather
// than per-line like lineStatusesByLine below.
export function stationStatusFor(reports: UserReport[], station: string, now: Date = new Date()): LineStatus {
  const lineIds = new Set<string>(linesForStation(station).map((l) => l.id));
  const cutoff = now.getTime() - STATUS_WINDOW_MS;
  const recent = reports.filter(
    (r) => r.lineId && lineIds.has(r.lineId) && new Date(r.createdAt).getTime() >= cutoff,
  );
  return lineStatusFor(recent);
}

// Convenience: derive every line's status in one pass over the report
// list, keyed by line_id. Lines with no reports at all are simply absent
// from the map — callers should treat a missing entry the same as
// NORMAL_STATUS.
export function lineStatusesByLine(reports: UserReport[], now: Date = new Date()): Map<string, LineStatus> {
  const byLine = new Map<string, UserReport[]>();
  const cutoff = now.getTime() - STATUS_WINDOW_MS;
  for (const report of reports) {
    if (!report.lineId) continue;
    if (new Date(report.createdAt).getTime() < cutoff) continue;
    const list = byLine.get(report.lineId);
    if (list) list.push(report);
    else byLine.set(report.lineId, [report]);
  }

  const statuses = new Map<string, LineStatus>();
  for (const [lineId, lineReports] of byLine) {
    statuses.set(lineId, lineStatusFor(lineReports));
  }
  return statuses;
}
