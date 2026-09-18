"use client";

import { useEffect, useState } from "react";
import { getHourlyPingCounts, type HourlyPingCount } from "@/lib/pings-client";

// Synthetic baseline — deterministic, not real data. Still the whole
// story wherever real pings don't exist yet for an hour (no backend, a
// fetch failure, or just not enough people pinged that hour): see
// mergePingForecast/useForecast below for how real data, where it
// exists, replaces this hour by hour rather than switching the whole
// chart over at once.

// Small string hash so the same route always renders the same "typical"
// pattern instead of reshuffling on every reload.
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Bell-curve bias around the two commute rush windows, so the mock data
// still looks like a plausible transit crowding curve rather than noise.
function rushBias(hour: number): number {
  const morning = Math.exp(-((hour - 7.5) ** 2) / 3);
  const evening = Math.exp(-((hour - 18) ** 2) / 4);
  return Math.max(morning, evening);
}

export type HourForecast = { hour: number; crowdLevel: number }; // crowdLevel 0-100

export function hourlyForecast(routeId: string): HourForecast[] {
  const seed = hash(routeId);
  return Array.from({ length: 24 }, (_, hour) => {
    const noise = ((seed * (hour + 1)) % 37) / 37; // 0..1, stable per route+hour
    const level = rushBias(hour) * 75 + noise * 25;
    return { hour, crowdLevel: Math.round(Math.min(100, level)) };
  });
}

// Returns a dictionary key rather than English text directly — callers
// pick the translated string via dict.forecast[crowdLevelKey(level)].
export function crowdLevelKey(level: number): "packed" | "busy" | "comfortable" | "quiet" {
  if (level >= 70) return "packed";
  if (level >= 40) return "busy";
  if (level >= 15) return "comfortable";
  return "quiet";
}

export function forecastForTime(routeId: string, time: string): HourForecast {
  const hour = Number(time.split(":")[0] ?? 0);
  return hourlyForecast(routeId)[hour] ?? { hour, crowdLevel: 0 };
}

// Same lookup as forecastForTime, but against an already-fetched (and
// possibly ping-upgraded) forecast array instead of recomputing the
// synthetic one — what useForecast's callers use to read a single hour
// out of the merged curve.
export function forecastEntryForTime(forecast: HourForecast[], time: string): HourForecast {
  const hour = Number(time.split(":")[0] ?? 0);
  return forecast[hour] ?? { hour, crowdLevel: 0 };
}

// A real hourly ping count doesn't come pre-scaled to the synthetic
// curve's 0-100 "typical crowding" range, so it needs a reference point.
// 250 pings in one station/hour is treated as "packed" (100) — the same
// order of magnitude as lib/crowd-mock.ts's `busier` threshold (a count
// over 150 for a single route+time). Not calibrated against real
// ridership (see server/ridership-schema.sql's baseline table, not wired
// in yet) — a loose stand-in, same honesty as the rest of this module.
const PING_SATURATION_COUNT = 250;

function levelFromPingCount(count: number): number {
  return Math.max(0, Math.min(100, Math.round((count / PING_SATURATION_COUNT) * 100)));
}

// Replaces the synthetic baseline's hour with a real, count-derived
// level wherever pings cleared the publication floor for that hour;
// every other hour keeps the synthetic value, so the chart never has a
// gap — just a mix of "typical" and "what's actually happening today"
// bars, same fail-soft shape as the dashboard's ping count.
export function mergePingForecast(base: HourForecast[], pings: HourlyPingCount[]): HourForecast[] {
  const byHour = new Map(pings.map((p) => [p.hour, p]));
  return base.map((entry) => {
    const real = byHour.get(entry.hour);
    if (!real || real.suppressed || real.count === null) return entry;
    return { hour: entry.hour, crowdLevel: levelFromPingCount(real.count) };
  });
}

// Synthetic forecast immediately (so the chart never renders empty),
// upgraded in place with real pings once (if) app/api/pings/hourly
// answers — same fail-soft pattern as app/dashboard/page.tsx's ping
// count: no backend, an unreachable API, or a static export all just
// leave the synthetic curve standing.
export function useForecast(routeId: string, station: string, date: string): HourForecast[] {
  const [forecast, setForecast] = useState<HourForecast[]>(() => hourlyForecast(routeId));

  useEffect(() => {
    const base = hourlyForecast(routeId);
    setForecast(base);

    let cancelled = false;
    getHourlyPingCounts(station, date)
      .then((pings) => {
        if (cancelled) return;
        setForecast(mergePingForecast(base, pings));
      })
      .catch(() => {
        // Keep the synthetic baseline already set above.
      });

    return () => {
      cancelled = true;
    };
  }, [routeId, station, date]);

  return forecast;
}
