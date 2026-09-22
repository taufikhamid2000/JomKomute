"use client";

// Per-line first/last train times, weekday vs weekend, plus any holiday
// note — one card per line, colored/named from lib/lines.ts (same source
// as the rest of the app), data fetched client-side from
// line_operating_hours (see lib/operating-hours-client.ts and
// supabase/migrations/20260919150000_line_operating_hours.sql). Rendered
// by the server app/operating-hours/page.tsx, which owns this route's
// metadata — kept a client component since useDictionary() reads the
// locale from localStorage and the hours/status fetches run client-side.

import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { LINES } from "@/lib/lines";
import { lineStatusesByLine, recentReportsForLine, type LineStatus } from "@/lib/line-status";
import { nearestStationTo } from "@/lib/nearest-station";
import { formatClockTime, getLineOperatingHours, isWeekend, type LineOperatingHours } from "@/lib/operating-hours-client";
import { reportCategoryMeta } from "@/lib/report-categories";
import { STATION_COORDS } from "@/lib/stations";
import { useDictionary } from "@/lib/use-dictionary";
import { getRecentUserReports, type UserReport } from "@/lib/user-reports-client";

// Groups `reports` by nearest station (out of `stations`, that line's own
// station list — a report was tagged with this lineId via its nearest
// corridor point at submit time, see route-corridor.ts, so scoping the
// nearest-station lookup to the line's own stations rather than every
// station in the network keeps it consistent with that). Sorted most-
// affected station first; a report whose nearest match still comes back
// null (STATION_COORDS missing an entry) is dropped rather than shown
// under a fake station name.
function groupReportsByStation(
  reports: UserReport[],
  stations: { name: string; coord: [number, number] }[],
): { station: string; reports: UserReport[] }[] {
  const byStation = new Map<string, UserReport[]>();
  for (const report of reports) {
    const name = nearestStationTo({ lat: report.lat, lng: report.lng }, stations);
    if (!name) continue;
    const list = byStation.get(name);
    if (list) list.push(report);
    else byStation.set(name, [report]);
  }
  return Array.from(byStation.entries())
    .map(([station, stationReports]) => ({ station, reports: stationReports }))
    .sort((a, b) => b.reports.length - a.reports.length);
}

export function OperatingHoursContent() {
  const { t } = useDictionary();
  const [hoursByLine, setHoursByLine] = useState<Map<string, LineOperatingHours> | null>(null);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [statusByLine, setStatusByLine] = useState<Map<string, LineStatus>>(new Map());
  const [today] = useState(() => new Date());
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const categoryMeta = reportCategoryMeta(t.reportPage.categories);

  useEffect(() => {
    let cancelled = false;
    getLineOperatingHours()
      .then((rows) => {
        if (cancelled) return;
        setHoursByLine(new Map(rows.map((r) => [r.lineId, r])));
      })
      // Best-effort — an empty/failed fetch just means every line falls
      // back to the "not available yet" state below, not a broken page.
      .catch(() => {
        if (!cancelled) setHoursByLine(new Map());
      });
    // Best-effort here too — a failed fetch just leaves every line at
    // the default "normal service" status rather than breaking the page.
    getRecentUserReports()
      .then((r) => {
        if (cancelled) return;
        setReports(r);
        setStatusByLine(lineStatusesByLine(r));
      })
      .catch(() => {
        if (!cancelled) setStatusByLine(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const weekend = isWeekend(today);

  // Station coordinates per line, built once — the candidate set
  // groupReportsByStation snaps each expanded line's reports onto.
  const stationsByLine = useMemo(() => {
    const map = new Map<string, { name: string; coord: [number, number] }[]>();
    for (const line of LINES) {
      const points: { name: string; coord: [number, number] }[] = [];
      for (const name of line.stations) {
        const coord = STATION_COORDS[name];
        if (coord) points.push({ name, coord });
      }
      map.set(line.id, points);
    }
    return map;
  }, []);

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">{t.operatingHoursPage.title}</h1>
          <p className="text-sm text-foreground/60">{t.operatingHoursPage.description}</p>
        </div>

        <div className="flex flex-col gap-3">
          {LINES.map((line) => {
            const hours = hoursByLine?.get(line.id);
            const status = statusByLine.get(line.id);
            const worstMeta = status?.worstCategory ? categoryMeta.find((c) => c.id === status.worstCategory) : undefined;
            return (
              <div key={line.id} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: line.color }} />
                  <span className="truncate text-sm font-semibold text-foreground">{line.name}</span>
                </div>

                {(() => {
                  const isReported = status?.level === "reported" && !!status.worstCategory;
                  const isExpanded = expandedLineId === line.id;
                  const statusRow = (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: isReported ? (worstMeta?.color ?? "#475569") : "#16a34a" }}
                      />
                      <span
                        className={`text-xs font-medium ${isReported ? "" : "text-foreground/50"}`}
                        style={isReported ? { color: worstMeta?.color } : undefined}
                      >
                        {isReported && status?.worstCategory
                          ? t.operatingHoursPage.statusReported(status.count, worstMeta?.label ?? status.worstCategory)
                          : t.operatingHoursPage.statusNormal}
                      </span>
                    </>
                  );

                  if (!isReported) {
                    return <div className="flex items-center gap-1.5">{statusRow}</div>;
                  }

                  return (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? t.operatingHoursPage.collapseReports : t.operatingHoursPage.expandReports}
                        className="flex cursor-pointer items-center gap-1.5 self-start rounded-md hover:opacity-80"
                      >
                        {statusRow}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                          className={`text-foreground/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <ul className="flex flex-col gap-1.5 rounded-lg bg-[var(--nav-hover-bg)] p-2.5">
                          {groupReportsByStation(recentReportsForLine(reports, line.id), stationsByLine.get(line.id) ?? []).map(
                            ({ station, reports: stationReports }) => (
                              <li key={station} className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate text-foreground/80">{station}</span>
                                <span className="shrink-0 text-foreground/50">{t.operatingHoursPage.reportCount(stationReports.length)}</span>
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })()}

                {hoursByLine === null ? (
                  <div className="h-10 animate-pulse rounded-lg bg-muted" />
                ) : !hours ? (
                  <span className="text-xs text-foreground/50">{t.operatingHoursPage.empty}</span>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <ScheduleColumn
                      label={t.operatingHoursPage.weekday}
                      highlighted={!weekend}
                      todayLabel={t.operatingHoursPage.today}
                      firstLabel={t.operatingHoursPage.first}
                      lastLabel={t.operatingHoursPage.last}
                      first={hours.weekdayFirst}
                      last={hours.weekdayLast}
                    />
                    <ScheduleColumn
                      label={t.operatingHoursPage.weekend}
                      highlighted={weekend}
                      todayLabel={t.operatingHoursPage.today}
                      firstLabel={t.operatingHoursPage.first}
                      lastLabel={t.operatingHoursPage.last}
                      first={hours.weekendFirst}
                      last={hours.weekendLast}
                    />
                  </div>
                )}

                {hours?.holidayNote && <p className="text-[11px] text-foreground/50">{hours.holidayNote}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function ScheduleColumn({
  label,
  highlighted,
  todayLabel,
  firstLabel,
  lastLabel,
  first,
  last,
}: {
  label: string;
  highlighted: boolean;
  todayLabel: string;
  firstLabel: string;
  lastLabel: string;
  first: string | null;
  last: string | null;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg p-2 ${highlighted ? "bg-primary/5 ring-1 ring-primary/30" : ""}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-foreground/50 uppercase">
        {label}
        {highlighted && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground normal-case">{todayLabel}</span>}
      </span>
      {first && last ? (
        <span className="text-xs text-foreground/80">
          {firstLabel} {formatClockTime(first)} · {lastLabel} {formatClockTime(last)}
        </span>
      ) : (
        <span className="text-xs text-foreground/40">—</span>
      )}
    </div>
  );
}
