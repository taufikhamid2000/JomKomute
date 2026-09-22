// Crowdsourced per-line status derived from visible user reports (see
// lib/user-reports-client.ts's getRecentUserReports(), which reads from
// the jomkomute.user_reports_visible view). "Still happening" is decided
// the same way everywhere in this app: a report stays visible for 24h
// and until riders' votes net-dispute it away — that view already
// applies both. There's no separate, shorter cutoff here on top of
// that: an issue confirmed as ongoing by votes an hour ago is still
// ongoing now as far as this app actually knows, and inventing a
// stricter timer would silently show "Normal service" for something
// that's still broken.

import { linesForStation } from "@/lib/lines";
import type { ReportCategory, UserReport } from "@/lib/user-reports-client";

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

// Visible reports scoped to `lineId` — pass the result to lineStatusFor
// per line rather than re-filtering the full report list once per line.
export function recentReportsForLine(reports: UserReport[], lineId: string): UserReport[] {
  return reports.filter((r) => r.lineId === lineId);
}

// Aggregates a line's reports into a simple status summary. Empty input
// reads as "normal" — the vast majority of lines most of the time,
// given real-world report volume.
export function lineStatusFor(lineReports: UserReport[]): LineStatus {
  if (lineReports.length === 0) return NORMAL_STATUS;

  let worstCategory: ReportCategory = lineReports[0].category;
  let worstRank = SEVERITY_ORDER.indexOf(worstCategory);
  for (const report of lineReports) {
    const rank = SEVERITY_ORDER.indexOf(report.category);
    if (rank !== -1 && (worstRank === -1 || rank < worstRank)) {
      worstRank = rank;
      worstCategory = report.category;
    }
  }

  return { level: "reported", count: lineReports.length, worstCategory };
}

// A single station's status — the worst status across every line that
// serves it (a station on two lines is "reported" if either one is),
// used by the station info popup (components/station-popup.tsx) rather
// than per-line like lineStatusesByLine below.
export function stationStatusFor(reports: UserReport[], station: string): LineStatus {
  const lineIds = new Set<string>(linesForStation(station).map((l) => l.id));
  const matching = reports.filter((r) => r.lineId && lineIds.has(r.lineId));
  return lineStatusFor(matching);
}

// Convenience: derive every line's status in one pass over the report
// list, keyed by line_id. Lines with no reports at all are simply absent
// from the map — callers should treat a missing entry the same as
// NORMAL_STATUS.
export function lineStatusesByLine(reports: UserReport[]): Map<string, LineStatus> {
  const byLine = new Map<string, UserReport[]>();
  for (const report of reports) {
    if (!report.lineId) continue;
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
