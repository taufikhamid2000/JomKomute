#!/usr/bin/env node
// Derives per-line first/last train times (weekday vs weekend, plus a
// holiday-schedule note) from the same two official GTFS static feeds
// used by scripts/generate-stations.mjs
// (https://developer.data.gov.my/realtime-api/gtfs-static):
//   - Prasarana, category=rapid-rail-kl — LRT, MRT, KL Monorail, BRT Sunway
//   - KTMB — filtered to the two Klang Valley Komuter lines (route_type "0")
//
// v1 scope, not a perfect pipeline: this is a one-time/manual-rerun seed
// script, not something wired into CI. It prints a ready-to-paste SQL
// `insert ... on conflict` block (also mirrored into the migration file
// supabase/migrations/*_line_operating_hours.sql) rather than writing to
// the database itself — this app has no live write credential available
// to scripts (writes only ever happen from the browser via anon/RLS, see
// lib/user-reports-client.ts), and migrations are the repo's actual path
// to schema + seed data (applied by .github/workflows/supabase-migrations.yml).
//
// Route-id -> line-id mapping: reuses the exact same RAPID_LINE_ID_SLUG /
// KTMB_LINE_ID_SLUG tables as scripts/generate-stations.mjs (route_id is
// the stable GTFS key on both feeds; lib/lines.ts's `id` field must match
// these slugs for `lineById()` lookups elsewhere in the app to work, so
// keeping one canonical mapping in sync across both scripts matters).
// Any route_id with no slug entry is skipped rather than guessed at, and
// any line in lib/lines.ts with no matching feed route is simply absent
// from the output — per the task, skip rather than fail.
//
// Weekday/weekend split: derived from calendar.txt's monday..sunday
// columns rather than hardcoded service_id strings, since the two feeds
// don't share a service_id convention — KTMB happens to use literal
// "komuter_weekday"/"komuter_weekend" (see generate-stations.mjs), but
// Prasarana's calendar.txt doesn't. A service counts as "weekday" if it
// runs on any of Mon-Fri, "weekend" if it runs on Sat or Sun (a service
// can be both, e.g. every day).
//
// Holiday handling: intentionally shallow. calendar_dates.txt exception
// rows (exception_type "2" = service removed) are treated as evidence
// that *some* holiday schedule difference exists for that line, recorded
// as a plain boolean-derived note — not modeled per calendar date.
//
// Feed shape note (Prasarana/rapid-rail-kl): trips.txt only publishes one
// representative trip per route/direction/service-day (MonFri/Sat/Sun),
// and that trip's stop_times.txt rows are just its own stop-to-stop
// offsets — not a real first/last spread. The actual daily span lives in
// frequencies.txt (start_time/end_time/headway_secs per trip_id), so
// applyFrequencies() below overrides the stop_times-derived guess with
// frequencies.txt's block start/end whenever it's present. KTMB's feed
// has no frequencies.txt and fully enumerates stop_times.txt instead, so
// its first/last times come straight from buildOperatingHours().
//
// Usage: node scripts/generate-operating-hours.mjs

import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RAPID_RAIL_URL = "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl";
const KTMB_URL = "https://api.data.gov.my/gtfs-static/ktmb";

// Same slugs as scripts/generate-stations.mjs's RAPID_LINE_ID_SLUG /
// KTMB_LINE_ID_SLUG — kept in sync by hand since there's no shared module
// between the two one-off scripts yet.
const RAPID_LINE_ID_SLUG = {
  AG: "ampang",
  KJ: "kelana-jaya",
  PH: "sri-petaling",
  KGL: "kajang",
  PYL: "putrajaya",
  MR: "monorail",
  BRT: "brt-sunway",
  SA: "shah-alam",
};

const KTMB_LINE_ID_SLUG = {
  KA15_KD19: "komuter-port-klang",
  KC05_KB18: "komuter-seremban",
};

// lib/lines.ts's LINES[].name for each slug — used for the seed's
// line_name column and for the console report. Kept alongside this
// script rather than importing lib/stations.ts, since that file only
// exists after generate-stations.mjs has already run and this script
// should work standalone.
const LINE_NAMES = {
  ampang: "LRT Ampang Line",
  "kelana-jaya": "LRT Kelana Jaya Line",
  "sri-petaling": "MRT Sri Petaling Line",
  kajang: "MRT Kajang Line",
  putrajaya: "MRT Putrajaya Line",
  monorail: "KL Monorail",
  "brt-sunway": "BRT Sunway Line",
  "shah-alam": "LRT Shah Alam Line",
  "komuter-seremban": "KTM Komuter Seremban Line",
  "komuter-port-klang": "KTM Komuter Port Klang Line",
};

function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function parseCsv(text) {
  const clean = text.replace(/^﻿/, "").trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function fetchGtfsFeed(url, destDir) {
  // Same approach as scripts/generate-stations.mjs's fetchGtfsFeed:
  // explicit bash so this works the same way on Windows (execSync's
  // default shell is cmd.exe, which can't do the `&&` chaining here).
  execSync(`curl -sfL "${url}" -o feed.zip && unzip -oq feed.zip -x "__MACOSX/*"`, {
    cwd: destDir,
    shell: "bash",
  });
  return {
    read: (file) => {
      try {
        return readFileSync(join(destDir, file), "utf8");
      } catch {
        return null; // optional files (e.g. calendar_dates.txt) may be absent
      }
    },
  };
}

// GTFS times are "H:MM:SS"/"HH:MM:SS" and can exceed 24:00:00 for
// past-midnight trips.
function parseGtfsTime(hms) {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function formatGtfsSeconds(totalSeconds) {
  // Normalize a possibly->24h+ GTFS second count back into a wall-clock
  // "HH:MM:SS" for display/SQL `time` storage — a 25:30:00 "last train"
  // really means 01:30 the next morning, which is what riders (and a SQL
  // `time` column) actually want to see.
  const wrapped = ((totalSeconds % 86400) + 86400) % 86400;
  const h = Math.floor(wrapped / 3600);
  const m = Math.floor((wrapped % 3600) / 60);
  const s = Math.floor(wrapped % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

// Builds a service_id -> {weekday, weekend} map from calendar.txt.
function buildServiceDayMap(calendarRows) {
  const map = new Map();
  for (const row of calendarRows) {
    const weekday = ["monday", "tuesday", "wednesday", "thursday", "friday"].some((d) => row[d] === "1");
    const weekend = ["saturday", "sunday"].some((d) => row[d] === "1");
    map.set(row.service_id, { weekday, weekend });
  }
  return map;
}

// Derives one line's operating-hours row from its GTFS trips/stop_times,
// given a matcher for which trips belong to the route(s) this line id
// covers, and the feed's calendar.txt-derived service-day map.
function buildOperatingHours({ id, name, trips, stopTimes, serviceDayMap, hasHolidayException, matchesTrip }) {
  const candidateTrips = trips.filter(matchesTrip);
  if (candidateTrips.length === 0) return null;

  // First-stop departure time per trip (stop_sequence "1", or whichever
  // is lowest) — "last train" is about when it *leaves* the origin, not
  // when the whole run finishes.
  const firstStopByTrip = new Map();
  for (const st of stopTimes) {
    if (!st.departure_time) continue;
    const existing = firstStopByTrip.get(st.trip_id);
    const seq = Number(st.stop_sequence);
    if (!existing || seq < existing.seq) {
      firstStopByTrip.set(st.trip_id, { seq, departureSeconds: parseGtfsTime(st.departure_time) });
    }
  }

  let weekdayFirst = null;
  let weekdayLast = null;
  let weekendFirst = null;
  let weekendLast = null;
  let sawWeekday = false;
  let sawWeekend = false;

  for (const trip of candidateTrips) {
    const stop = firstStopByTrip.get(trip.trip_id);
    if (!stop) continue;
    const days = serviceDayMap.get(trip.service_id);
    if (!days) continue;
    const sec = stop.departureSeconds;
    if (days.weekday) {
      sawWeekday = true;
      weekdayFirst = weekdayFirst === null ? sec : Math.min(weekdayFirst, sec);
      weekdayLast = weekdayLast === null ? sec : Math.max(weekdayLast, sec);
    }
    if (days.weekend) {
      sawWeekend = true;
      weekendFirst = weekendFirst === null ? sec : Math.min(weekendFirst, sec);
      weekendLast = weekendLast === null ? sec : Math.max(weekendLast, sec);
    }
  }

  if (!sawWeekday && !sawWeekend) return null;

  return {
    id,
    name,
    weekdayFirst: sawWeekday ? formatGtfsSeconds(weekdayFirst) : null,
    weekdayLast: sawWeekday ? formatGtfsSeconds(weekdayLast) : null,
    weekendFirst: sawWeekend ? formatGtfsSeconds(weekendFirst) : null,
    weekendLast: sawWeekend ? formatGtfsSeconds(weekendLast) : null,
    holidayNote: hasHolidayException
      ? "Holiday schedule differs from the regular weekday/weekend timetable — check the operator's app or signage on public holidays."
      : null,
  };
}

// Prasarana's feed schedules most of the day via frequencies.txt
// (start_time/end_time/headway_secs blocks per trip_id) rather than
// enumerating every individual departure in stop_times.txt — stop_times.txt
// there only holds one representative trip's *relative* stop-to-stop
// offsets, so reading first/last purely from stop_times.txt (as
// buildOperatingHours does, which is correct for KTMB's fully-enumerated
// feed) badly understates a Prasarana line's actual last-train time. When
// frequencies.txt is present this recomputes first/last per trip_id as the
// earliest block start_time / latest block end_time instead.
function applyFrequencies(result, { trips, frequencies, serviceDayMap, matchesTrip }) {
  if (!result || frequencies.length === 0) return result;
  const candidateTripIds = new Set(trips.filter(matchesTrip).map((t) => t.trip_id));
  const tripById = new Map(trips.map((t) => [t.trip_id, t]));

  let weekdayFirst = null;
  let weekdayLast = null;
  let weekendFirst = null;
  let weekendLast = null;
  let sawWeekday = false;
  let sawWeekend = false;

  for (const freq of frequencies) {
    if (!candidateTripIds.has(freq.trip_id)) continue;
    const trip = tripById.get(freq.trip_id);
    const days = trip && serviceDayMap.get(trip.service_id);
    if (!days) continue;
    const start = parseGtfsTime(freq.start_time);
    // The last vehicle of a block departs at (or just before) end_time —
    // end_time itself is close enough for a "last train" display.
    const end = parseGtfsTime(freq.end_time);
    if (days.weekday) {
      sawWeekday = true;
      weekdayFirst = weekdayFirst === null ? start : Math.min(weekdayFirst, start);
      weekdayLast = weekdayLast === null ? end : Math.max(weekdayLast, end);
    }
    if (days.weekend) {
      sawWeekend = true;
      weekendFirst = weekendFirst === null ? start : Math.min(weekendFirst, start);
      weekendLast = weekendLast === null ? end : Math.max(weekendLast, end);
    }
  }

  if (!sawWeekday && !sawWeekend) return result; // no frequencies matched — keep the stop_times-derived fallback

  return {
    ...result,
    weekdayFirst: sawWeekday ? formatGtfsSeconds(weekdayFirst) : result.weekdayFirst,
    weekdayLast: sawWeekday ? formatGtfsSeconds(weekdayLast) : result.weekdayLast,
    weekendFirst: sawWeekend ? formatGtfsSeconds(weekendFirst) : result.weekendFirst,
    weekendLast: sawWeekend ? formatGtfsSeconds(weekendLast) : result.weekendLast,
  };
}

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

const tmp = mkdtempSync(join(tmpdir(), "gtfs-hours-"));
try {
  const results = [];

  // --- Prasarana: LRT/MRT/Monorail/BRT ---
  {
    const dir = join(tmp, "rapid-rail");
    mkdirSync(dir, { recursive: true });
    const feed = fetchGtfsFeed(RAPID_RAIL_URL, dir);
    const routes = parseCsv(feed.read("routes.txt") ?? "").filter((r) => r.status === "valid");
    const trips = parseCsv(feed.read("trips.txt") ?? "");
    const stopTimes = parseCsv(feed.read("stop_times.txt") ?? "");
    const calendar = parseCsv(feed.read("calendar.txt") ?? "");
    const calendarDates = parseCsv(feed.read("calendar_dates.txt") ?? "");
    const frequencies = parseCsv(feed.read("frequencies.txt") ?? "");
    const serviceDayMap = buildServiceDayMap(calendar);
    const exceptionServiceIds = new Set(calendarDates.filter((r) => r.exception_type === "2").map((r) => r.service_id));

    for (const route of routes) {
      const lineId = RAPID_LINE_ID_SLUG[route.route_id];
      if (!lineId) continue; // no line in lib/lines.ts maps to this route — skip, don't guess
      const matchesTrip = (t) => t.route_id === route.route_id;
      let result = buildOperatingHours({
        id: lineId,
        name: LINE_NAMES[lineId] ?? route.route_long_name,
        trips,
        stopTimes,
        serviceDayMap,
        hasHolidayException: trips.some((t) => t.route_id === route.route_id && exceptionServiceIds.has(t.service_id)),
        matchesTrip,
      });
      // Prasarana schedules service via frequencies.txt blocks, not fully
      // enumerated stop_times.txt rows — override with the frequency-block
      // derived first/last when available (see applyFrequencies above).
      result = applyFrequencies(result, { trips, frequencies, serviceDayMap, matchesTrip });
      if (result) results.push(result);
    }
  }

  // --- KTMB: Komuter only (route_type "0") ---
  {
    const dir = join(tmp, "ktmb");
    mkdirSync(dir, { recursive: true });
    const feed = fetchGtfsFeed(KTMB_URL, dir);
    const routes = parseCsv(feed.read("routes.txt") ?? "").filter((r) => r.route_type === "0");
    const trips = parseCsv(feed.read("trips.txt") ?? "");
    const stopTimes = parseCsv(feed.read("stop_times.txt") ?? "");
    const calendar = parseCsv(feed.read("calendar.txt") ?? "");
    const calendarDates = parseCsv(feed.read("calendar_dates.txt") ?? "");
    const serviceDayMap = buildServiceDayMap(calendar);
    const exceptionServiceIds = new Set(calendarDates.filter((r) => r.exception_type === "2").map((r) => r.service_id));

    for (const route of routes) {
      const lineId = KTMB_LINE_ID_SLUG[route.route_id];
      if (!lineId) continue;
      const result = buildOperatingHours({
        id: lineId,
        name: LINE_NAMES[lineId] ?? `KTM ${route.route_short_name}`,
        trips,
        stopTimes,
        serviceDayMap,
        hasHolidayException: trips.some((t) => t.route_id === route.route_id && exceptionServiceIds.has(t.service_id)),
        matchesTrip: (t) => t.route_id === route.route_id,
      });
      if (result) results.push(result);
    }
  }

  console.log(`-- Derived from ${results.length} line(s). Skipped any lib/lines.ts line with no matching feed route.`);
  console.log("insert into line_operating_hours (line_id, line_name, weekday_first, weekday_last, weekend_first, weekend_last, holiday_note)");
  console.log("values");
  console.log(
    results
      .map(
        (r, i) =>
          `  (${sqlString(r.id)}, ${sqlString(r.name)}, ${sqlString(r.weekdayFirst)}, ${sqlString(r.weekdayLast)}, ${sqlString(r.weekendFirst)}, ${sqlString(r.weekendLast)}, ${sqlString(r.holidayNote)})` +
          (i === results.length - 1 ? "" : ",")
      )
      .join("\n")
  );
  console.log("on conflict (line_id) do update set");
  console.log("  line_name = excluded.line_name,");
  console.log("  weekday_first = excluded.weekday_first,");
  console.log("  weekday_last = excluded.weekday_last,");
  console.log("  weekend_first = excluded.weekend_first,");
  console.log("  weekend_last = excluded.weekend_last,");
  console.log("  holiday_note = excluded.holiday_note,");
  console.log("  updated_at = now();");

  const covered = new Set(results.map((r) => r.id));
  const allSlugs = { ...RAPID_LINE_ID_SLUG, ...KTMB_LINE_ID_SLUG };
  const skipped = Object.values(allSlugs).filter((id) => !covered.has(id));
  if (skipped.length > 0) {
    console.error(`Skipped (no matching feed data): ${skipped.join(", ")}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
