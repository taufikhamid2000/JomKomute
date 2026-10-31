// "Today's verdict": one answer for a saved commute (go as usual, switch
// lines, or stay home), worked out from the same inputs the rest of the
// app already has: the saved route's origin/destination, the route
// finder's alternatives (lib/route-finder.ts), and the live rider reports
// per line (lib/line-status.ts). No official operator feed is involved,
// so the verdict is only as good as the reports behind it. The UI says so.
//
// Pure: no React, no fetching, so it's easy to reason about and test.

import { lineStatusFor, recentReportsForLine, type LineStatus } from "@/lib/line-status";
import type { RouteOption } from "@/lib/route-finder";
import type { ReportCategory, UserReport } from "@/lib/user-reports-client";

// "disrupted" means the trip itself is likely affected (a train stuck,
// running late, an accident). "busy" is crowding or an unspecified report:
// worth knowing, not worth changing lines over on its own.
export type Severity = "clear" | "busy" | "disrupted";

const DISRUPTIVE: ReportCategory[] = ["breakdown", "accident", "delay"];
const SEVERITY_RANK: Record<Severity, number> = { clear: 0, busy: 1, disrupted: 2 };

export type LineAssessment = { lineId: string; status: LineStatus; severity: Severity };

export type OptionAssessment = {
  option: RouteOption;
  lines: LineAssessment[];
  severity: Severity; // worst across the option's lines
  reportCount: number; // total reports across the option's lines
};

export type Verdict =
  // The usual (fastest) route is fine. `tip` is a cleaner alternative when
  // the usual one only has crowding reports.
  | { kind: "go"; usual: OptionAssessment; tip: OptionAssessment | null; options: OptionAssessment[] }
  // The usual route is disrupted but another one isn't.
  | { kind: "switch"; usual: OptionAssessment; best: OptionAssessment; options: OptionAssessment[] }
  // Every option has disruption reports.
  | { kind: "stay"; usual: OptionAssessment; options: OptionAssessment[] };

function severityOf(status: LineStatus, lineReports: UserReport[]): Severity {
  if (status.level === "normal") return "clear";
  return lineReports.some((r) => DISRUPTIVE.includes(r.category)) ? "disrupted" : "busy";
}

function assessOption(option: RouteOption, reports: UserReport[]): OptionAssessment {
  // A line can appear in more than one leg (rare, but a route can leave and
  // rejoin a line); count it once.
  const lineIds = Array.from(new Set(option.legs.map((leg) => leg.line)));
  const lines = lineIds.map((lineId) => {
    const lineReports = recentReportsForLine(reports, lineId);
    const status = lineStatusFor(lineReports);
    return { lineId, status, severity: severityOf(status, lineReports) };
  });
  const severity = lines.reduce<Severity>((worst, l) => (SEVERITY_RANK[l.severity] > SEVERITY_RANK[worst] ? l.severity : worst), "clear");
  const reportCount = lines.reduce((sum, l) => sum + l.status.count, 0);
  return { option, lines, severity, reportCount };
}

// Better = less severe, then fewer reports, then faster.
function compareOptions(a: OptionAssessment, b: OptionAssessment): number {
  return (
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    a.reportCount - b.reportCount ||
    a.option.totalMinutes - b.option.totalMinutes
  );
}

// `options` is findRouteOptions()'s output for the saved route, fastest
// first, so options[0] is the rider's usual way. Returns null when there's
// nothing to judge (no route between the two stations).
export function computeVerdict(options: RouteOption[] | undefined, reports: UserReport[]): Verdict | null {
  if (!options || options.length === 0) return null;

  const assessed = options.map((o) => assessOption(o, reports));
  const usual = assessed[0];
  const best = [...assessed].sort(compareOptions)[0];

  if (usual.severity !== "disrupted") {
    const tip = usual.severity === "busy" && best !== usual && best.severity === "clear" ? best : null;
    return { kind: "go", usual, tip, options: assessed };
  }
  if (best.severity !== "disrupted") {
    return { kind: "switch", usual, best, options: assessed };
  }
  return { kind: "stay", usual, options: assessed };
}

// The line that sets an option apart from the usual route: its first line
// the usual route doesn't use. That's what a rider would name ("take the
// MRT instead"). Falls back to the option's first line.
export function distinguishingLine(option: OptionAssessment, usual: OptionAssessment): string {
  const usualLines = new Set(usual.option.legs.map((l) => l.line));
  return option.option.legs.find((l) => !usualLines.has(l.line))?.line ?? option.option.legs[0].line;
}
