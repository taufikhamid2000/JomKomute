"use client";

// Per-line first/last train times, weekday vs weekend, plus any holiday
// note — one card per line, colored/named from lib/lines.ts (same source
// as the rest of the app), data fetched client-side from
// line_operating_hours (see lib/operating-hours-client.ts and
// supabase/migrations/20260919150000_line_operating_hours.sql). Rendered
// by the server app/line-status/page.tsx, which owns this route's
// metadata — kept a client component since useDictionary() reads the
// locale from localStorage and the hours/status fetches run client-side.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReportRow } from "@/components/report-row";
import { Shell } from "@/components/shell";
import { useFollowedLines } from "@/lib/followed-lines";
import { LINES } from "@/lib/lines";
import { lineStatusesByLine, recentReportsForLine, type LineStatus } from "@/lib/line-status";
import { nearestStationTo } from "@/lib/nearest-station";
import { formatClockTime, getLineOperatingHours, isWeekend, type LineOperatingHours } from "@/lib/operating-hours-client";
import {
  getExistingPushSubscription,
  isPushSupported,
  subscribeToPush,
  syncPushLineIds,
  unsubscribeFromPush,
} from "@/lib/push-notifications";
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

export function LineStatusContent() {
  const { t } = useDictionary();
  const [hoursByLine, setHoursByLine] = useState<Map<string, LineOperatingHours> | null>(null);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [statusByLine, setStatusByLine] = useState<Map<string, LineStatus>>(new Map());
  const [today] = useState(() => new Date());
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [expandedStation, setExpandedStation] = useState<string | null>(null);
  const [followedOnly, setFollowedOnly] = useState(false);
  const { followed, toggleFollowed } = useFollowedLines();
  const categoryMeta = reportCategoryMeta(t.reportPage.categories);

  // null while the initial check is in flight — kept separate from
  // false so the toggle doesn't flash "off" for a moment before the
  // real (possibly "on") state comes back from the browser's own
  // PushSubscription (see lib/push-notifications.ts's header for why
  // that, not a localStorage flag, is the source of truth here).
  const [notifyEnabled, setNotifyEnabled] = useState<boolean | null>(null);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  useEffect(() => {
    getExistingPushSubscription()
      .then((sub) => setNotifyEnabled(!!sub))
      .catch(() => setNotifyEnabled(false));
  }, []);

  // Keeps app/api/push/check's per-subscription line list current
  // whenever you follow/unfollow a line while notifications are
  // already on — no new permission prompt, just a quiet re-sync.
  useEffect(() => {
    if (notifyEnabled) syncPushLineIds(Array.from(followed)).catch(() => {});
  }, [followed, notifyEnabled]);

  async function handleToggleNotify() {
    setNotifyBusy(true);
    setNotifyError(null);
    try {
      if (notifyEnabled) {
        await unsubscribeFromPush();
        setNotifyEnabled(false);
      } else {
        await subscribeToPush(Array.from(followed));
        setNotifyEnabled(true);
      }
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : t.operatingHoursPage.notifyError);
    } finally {
      setNotifyBusy(false);
    }
  }

  // Shared by the initial fetch below and a vote/delete inside an
  // expanded station's report list (components/report-row.tsx) — either
  // can change what's actually visible (see
  // jomkomute.user_reports_visible), so both just re-run this.
  const refreshReports = useCallback(() => {
    return getRecentUserReports()
      .then((r) => {
        setReports(r);
        setStatusByLine(lineStatusesByLine(r));
      })
      .catch(() => {
        // Best-effort — a failed fetch just leaves every line at the
        // default "normal service" status, not a broken page.
      });
  }, []);

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
    refreshReports();
    return () => {
      cancelled = true;
    };
  }, [refreshReports]);

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

  // Followed lines first (stable — Array.prototype.sort keeps each
  // group's own relative order), so a rider who's marked their usual
  // lines sees them at the top without losing the rest of the network
  // below. followedOnly instead drops everything else entirely.
  const orderedLines = useMemo(() => {
    if (followedOnly) return LINES.filter((line) => followed.has(line.id));
    return [...LINES].sort((a, b) => Number(followed.has(b.id)) - Number(followed.has(a.id)));
  }, [followed, followedOnly]);

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">{t.operatingHoursPage.title}</h1>
          <p className="text-sm text-foreground/60">{t.operatingHoursPage.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-foreground/70">
            <input
              type="checkbox"
              checked={followedOnly}
              onChange={(e) => setFollowedOnly(e.target.checked)}
              disabled={followed.size === 0}
              className="h-3.5 w-3.5 cursor-pointer accent-primary disabled:cursor-not-allowed"
            />
            {t.operatingHoursPage.followedOnly}
          </label>

          {isPushSupported() && (
            <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-foreground/70">
              <input
                type="checkbox"
                checked={notifyEnabled ?? false}
                onChange={handleToggleNotify}
                disabled={notifyEnabled === null || notifyBusy || (notifyEnabled === false && followed.size === 0)}
                className="h-3.5 w-3.5 cursor-pointer accent-primary disabled:cursor-not-allowed"
              />
              {t.operatingHoursPage.notifyFollowedLines}
            </label>
          )}
        </div>
        {notifyError && <p className="text-xs text-[var(--destructive)]">{notifyError}</p>}

        <div className="flex flex-col gap-3">
          {orderedLines.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-foreground/50">
              {t.operatingHoursPage.noFollowedLines}
            </p>
          )}
          {orderedLines.map((line) => {
            const hours = hoursByLine?.get(line.id);
            const status = statusByLine.get(line.id);
            const worstMeta = status?.worstCategory ? categoryMeta.find((c) => c.id === status.worstCategory) : undefined;
            return (
              <div key={line.id} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: line.color }} />
                  <span className="truncate text-sm font-semibold text-foreground">{line.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleFollowed(line.id)}
                    aria-pressed={followed.has(line.id)}
                    aria-label={followed.has(line.id) ? t.operatingHoursPage.unfollow : t.operatingHoursPage.follow}
                    className="ml-auto cursor-pointer rounded-full p-1 text-foreground/30 hover:bg-[var(--nav-hover-bg)] hover:text-foreground/60"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill={followed.has(line.id) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      className={followed.has(line.id) ? "text-[#eab308]" : undefined}
                    >
                      <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L10 2.5Z" />
                    </svg>
                  </button>
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
                            ({ station, reports: stationReports }) => {
                              const stationKey = `${line.id}:${station}`;
                              const stationExpanded = expandedStation === stationKey;
                              return (
                                <li key={station} className="flex flex-col gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedStation(stationExpanded ? null : stationKey)}
                                    aria-expanded={stationExpanded}
                                    className="flex cursor-pointer items-center justify-between gap-2 rounded-md text-xs hover:opacity-80"
                                  >
                                    <span className="truncate text-foreground/80">{station}</span>
                                    <span className="flex shrink-0 items-center gap-1 text-foreground/50">
                                      {t.operatingHoursPage.reportCount(stationReports.length)}
                                      <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        aria-hidden="true"
                                        className={`text-foreground/40 transition-transform ${stationExpanded ? "rotate-180" : ""}`}
                                      >
                                        <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </span>
                                  </button>
                                  {stationExpanded && (
                                    <div className="flex flex-col rounded-md bg-background px-2 py-1">
                                      {stationReports.map((report) => {
                                        const meta = categoryMeta.find((c) => c.id === report.category);
                                        return (
                                          <ReportRow
                                            key={report.id}
                                            report={report}
                                            meta={meta}
                                            t={t.reportPage}
                                            onVoted={refreshReports}
                                            onDeleted={refreshReports}
                                          />
                                        );
                                      })}
                                    </div>
                                  )}
                                </li>
                              );
                            },
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
