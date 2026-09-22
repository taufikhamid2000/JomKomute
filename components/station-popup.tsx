"use client";

// A station info popup — tapping a station on the home map (see
// components/home-map.tsx's onPickStation) opens this instead of jumping
// straight into the report flow, closer to the reference screenshot's
// "tap a station, see its lines/status, then decide to report" flow.
// Same modal shell/animation as components/report-modal.tsx and
// components/change-plan-modal.tsx (bottom sheet on mobile, centered
// card on larger screens) for visual consistency.
//
// No arrival-time estimate here on purpose: a live "5m"/"9m" countdown
// like the reference screenshot's requires GTFS-realtime vehicle
// tracking, which this app doesn't ingest yet (only static GTFS
// schedules — first/last train, not live positions). Showing a fake
// countdown would be worse than showing none. Everything here is real
// data already available: which lines serve the station, and live
// crowdsourced status from recent reports on those lines.

import { useMemo } from "react";
import { distanceMeters } from "@/lib/geo-distance";
import { linesForStation } from "@/lib/lines";
import { stationStatusFor } from "@/lib/line-status";
import { reportCategoryMeta } from "@/lib/report-categories";
import { STATION_COORDS } from "@/lib/stations";
import { useDictionary } from "@/lib/use-dictionary";
import type { UserReport } from "@/lib/user-reports-client";

// Same "near enough to count as this spot" radius
// components/report-modal.tsx's route-corridor check uses — reports
// aren't tagged with a station name, only lat/lng, so "reports at this
// station" is a proximity filter rather than an exact match.
const NEARBY_REPORT_METERS = 300;

export function StationPopup({
  station,
  reports,
  onClose,
  onReport,
}: {
  station: string;
  reports: UserReport[];
  onClose: () => void;
  onReport: () => void;
}) {
  const { t } = useDictionary();
  const lines = linesForStation(station);
  const status = stationStatusFor(reports, station);
  const categories = reportCategoryMeta(t.reportPage.categories);
  const worstMeta = status.worstCategory ? categories.find((c) => c.id === status.worstCategory) : undefined;

  // Every recent (24h — the same window jomkomute.user_reports_visible's
  // RLS select policy already scopes `reports` to) report near this
  // station's coordinates, newest first — not just the ones on its own
  // lines within the last hour like the status pill above, so tapping a
  // report marker's cluster (components/home-map.tsx's
  // onSelectReportCluster) always shows at least the report that was
  // tapped.
  const coord = STATION_COORDS[station];
  const nearbyReports = useMemo(() => {
    if (!coord) return [];
    return reports
      .filter((r) => distanceMeters({ lat: r.lat, lng: r.lng }, { lat: coord[0], lng: coord[1] }) <= NEARBY_REPORT_METERS)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports, coord]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={station}
      className="animate-backdrop-in fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex w-full max-w-sm flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-5 sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">{station}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.reportPage.close}
            className="cursor-pointer rounded-full p-1 text-foreground/50 hover:bg-[var(--nav-hover-bg)] hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {lines.map((line) => (
            <span
              key={line.id}
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white"
              style={{ backgroundColor: line.color }}
            >
              {line.name}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: status.level === "reported" ? (worstMeta?.color ?? "#475569") : "#16a34a" }}
          />
          <span
            className={`text-xs font-medium ${status.level === "reported" ? "" : "text-foreground/50"}`}
            style={status.level === "reported" ? { color: worstMeta?.color } : undefined}
          >
            {status.level === "reported" && status.worstCategory
              ? t.operatingHoursPage.statusReported(status.count, worstMeta?.label ?? status.worstCategory)
              : t.operatingHoursPage.statusNormal}
          </span>
        </div>

        {nearbyReports.length > 0 && (
          <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto border-t border-border pt-2">
            {nearbyReports.map((report) => {
              const meta = categories.find((c) => c.id === report.category);
              return (
                <li key={report.id} className="flex items-start gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: meta?.color ?? "#475569", color: "white" }}
                  >
                    {meta?.icon}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{meta?.label ?? report.category}</span>
                      <span className="text-foreground/40">
                        {new Date(report.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {report.note && <span className="text-foreground/60">{report.note}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={onReport}
          className="mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-2.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 2.5 18 17H2L10 2.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M10 8v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="10" cy="14.3" r="1" fill="currentColor" />
          </svg>
          {t.homePage.reportFab}
        </button>
      </div>
    </div>
  );
}
