"use client";

// A line's own daily report count over the selected window — rider-
// perceived report volume, not Prasarana's official disruption count
// (see app/api/line-history/route.ts's header: different, unverified
// metric, not a rebuttal of theirs). Single series, so per
// dataviz conventions it carries no legend box — the card's own
// heading above this already says what line and what window it is.
//
// Plain SVG, not a charting library — this app has none installed,
// and a handful of daily bars doesn't need one. Coordinates are in a
// 0-100 x 0-32 unit box (viewBox, preserveAspectRatio="none") so the
// same markup scales to whatever width the card gives it.

const CHART_WIDTH = 100;
const CHART_HEIGHT = 32;
const GAP = 0.3;

export function LineHistoryChart({
  data,
  color,
}: {
  data: { date: string; count: number }[];
  color: string;
}) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const slot = CHART_WIDTH / Math.max(1, data.length);
  const barWidth = Math.max(0.05, slot - GAP);

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
      role="img"
      aria-label={`Daily report count, ${data.length} days`}
    >
      {data.map((d, i) => {
        // A day with 0 reports still gets a hairline-height bar (not
        // literally 0px) so every day is a visible, hoverable mark —
        // an invisible bar can't carry its own tooltip.
        const barHeight = d.count > 0 ? (d.count / maxCount) * (CHART_HEIGHT - 2) : 0.4;
        return (
          <rect
            key={d.date}
            x={i * slot}
            y={CHART_HEIGHT - barHeight}
            width={barWidth}
            height={barHeight}
            rx={0.3}
            fill={color}
            opacity={d.count > 0 ? 0.85 : 0.25}
          >
            <title>
              {d.date}: {d.count} {d.count === 1 ? "report" : "reports"}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
