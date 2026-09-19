// Direct-to-Supabase read for app/operating-hours/page.tsx and app/page.tsx's
// home-screen "last train" hint — follows lib/user-reports-client.ts's
// browser-client convention (anon key, safe from "use client" files, no API
// route to call through since this app is a static export).

import { supabaseBrowser } from "@/lib/supabase-client";

export type LineOperatingHours = {
  lineId: string;
  lineName: string | null;
  weekdayFirst: string | null;
  weekdayLast: string | null;
  weekendFirst: string | null;
  weekendLast: string | null;
  holidayNote: string | null;
};

type LineOperatingHoursRow = {
  line_id: string;
  line_name: string | null;
  weekday_first: string | null;
  weekday_last: string | null;
  weekend_first: string | null;
  weekend_last: string | null;
  holiday_note: string | null;
};

function fromRow(row: LineOperatingHoursRow): LineOperatingHours {
  return {
    lineId: row.line_id,
    lineName: row.line_name,
    weekdayFirst: row.weekday_first,
    weekdayLast: row.weekday_last,
    weekendFirst: row.weekend_first,
    weekendLast: row.weekend_last,
    holidayNote: row.holiday_note,
  };
}

// All lines' operating hours. Empty array pre-migration/pre-seed — callers
// treat that the same as "not available yet" rather than an error.
export async function getLineOperatingHours(): Promise<LineOperatingHours[]> {
  // supabaseBrowser() is untyped (see lib/supabase-client.ts), so select()
  // falls back to `never` — cast the row shape rather than threading a
  // generated Database type through just for this one table.
  const { data, error } = await supabaseBrowser().from("line_operating_hours").select();

  if (error) throw new Error(`Failed to load operating hours: ${error.message}`);
  return ((data ?? []) as unknown as LineOperatingHoursRow[]).map(fromRow);
}

// Saturday/Sunday, per the local clock — matches the weekday/weekend split
// scripts/generate-operating-hours.mjs derives from GTFS calendar.txt.
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// "HH:MM:SS"/"HH:MM" -> minutes since local midnight, or null if
// unparseable/missing.
function toMinutesSinceMidnight(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// Minutes from `now` until this line's last train today (weekday vs
// weekend picked from `now`'s own day), or null if that data isn't
// available or the last train has already gone. A GTFS last-departure
// time past midnight (e.g. "25:10:00" normalized to "01:10:00" by the
// generator script) is treated as tonight's late-night run, not
// tomorrow's — so it can still read as "soon" late in the evening.
export function minutesUntilLastTrain(hours: LineOperatingHours, now: Date): number | null {
  const last = isWeekend(now) ? hours.weekendLast : hours.weekdayLast;
  const lastMinutes = toMinutesSinceMidnight(last);
  if (lastMinutes === null) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // A last-departure clock time earlier than "now" almost always means a
  // past-midnight run (e.g. last train 01:10, now 23:40) rather than an
  // already-departed train — treat it as happening after midnight tonight.
  const diff = lastMinutes >= nowMinutes ? lastMinutes - nowMinutes : lastMinutes + 24 * 60 - nowMinutes;
  return diff;
}

// "HH:MM:SS" -> "11:45pm", for display.
export function formatClockTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")}${period}`;
}
