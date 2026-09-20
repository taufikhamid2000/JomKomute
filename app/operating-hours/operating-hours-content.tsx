"use client";

// Per-line first/last train times, weekday vs weekend, plus any holiday
// note — one card per line, colored/named from lib/lines.ts (same source
// as the rest of the app), data fetched client-side from
// line_operating_hours (see lib/operating-hours-client.ts and
// supabase/migrations/20260919150000_line_operating_hours.sql). Rendered
// by the server app/operating-hours/page.tsx, which owns this route's
// metadata — kept a client component since useDictionary() reads the
// locale from localStorage and the hours/status fetches run client-side.

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { LINES } from "@/lib/lines";
import { lineStatusesByLine, type LineStatus } from "@/lib/line-status";
import { formatClockTime, getLineOperatingHours, isWeekend, type LineOperatingHours } from "@/lib/operating-hours-client";
import { reportCategoryMeta } from "@/lib/report-categories";
import { useDictionary } from "@/lib/use-dictionary";
import { getRecentUserReports } from "@/lib/user-reports-client";

export function OperatingHoursContent() {
  const { t } = useDictionary();
  const [hoursByLine, setHoursByLine] = useState<Map<string, LineOperatingHours> | null>(null);
  const [statusByLine, setStatusByLine] = useState<Map<string, LineStatus>>(new Map());
  const [today] = useState(() => new Date());
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
      .then((reports) => {
        if (cancelled) return;
        setStatusByLine(lineStatusesByLine(reports));
      })
      .catch(() => {
        if (!cancelled) setStatusByLine(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const weekend = isWeekend(today);

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

                <div className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: status?.level === "reported" ? (worstMeta?.color ?? "#475569") : "#16a34a" }}
                  />
                  <span
                    className={`text-xs font-medium ${status?.level === "reported" ? "" : "text-foreground/50"}`}
                    style={status?.level === "reported" ? { color: worstMeta?.color } : undefined}
                  >
                    {status?.level === "reported" && status.worstCategory
                      ? t.operatingHoursPage.statusReported(status.count, worstMeta?.label ?? status.worstCategory)
                      : t.operatingHoursPage.statusNormal}
                  </span>
                </div>

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
