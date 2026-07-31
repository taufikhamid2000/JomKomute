"use client";

import { hourlyForecast } from "@/lib/forecast";

// 24 hourly bars, --chart-series-1 for the currently-scheduled hour so it
// stands out against the muted rest — same token set as the finance app's
// category charts, just applied to a bar instead of a donut slice.
export function ForecastBars({ routeId, highlightHour }: { routeId: string; highlightHour?: number }) {
  const data = hourlyForecast(routeId);
  const max = Math.max(...data.map((d) => d.crowdLevel), 1);

  return (
    <div className="flex gap-1">
      {data.map(({ hour, crowdLevel }) => {
        const isHighlighted = hour === highlightHour;
        return (
          <div key={hour} className="flex flex-1 flex-col items-center gap-1">
            {/* Fixed-height track so the bar's percentage height has a
                definite value to resolve against — a percentage height
                inside an auto-sized (items-end) flex parent computes to 0. */}
            <div className="flex h-24 w-full items-end">
              <div
                title={`${hour}:00 — ${crowdLevel}% typical crowding`}
                style={{
                  height: `${Math.max(4, (crowdLevel / max) * 100)}%`,
                  backgroundColor: isHighlighted ? "var(--chart-series-1)" : "var(--chart-muted)",
                  opacity: isHighlighted ? 1 : 0.45,
                }}
                className="w-full min-w-[3px] rounded-t-sm transition-colors"
              />
            </div>
            {hour % 3 === 0 && <span className="text-[10px] text-foreground/40">{hour}</span>}
          </div>
        );
      })}
    </div>
  );
}
