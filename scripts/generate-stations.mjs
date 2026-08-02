#!/usr/bin/env node
// Regenerates lib/stations.ts from two official GTFS static feeds on
// data.gov.my (https://developer.data.gov.my/realtime-api/gtfs-static):
//   - Prasarana, category=rapid-rail-kl — LRT, MRT, KL Monorail, BRT Sunway
//   - KTMB — filtered to just the two Klang Valley Komuter lines (route_type
//     "0"); the same feed also bundles Intercity/ETS long-distance routes
//     (route_type "2"), which aren't relevant to daily commuting and are
//     dropped
// Re-run this if either source's data changes; don't hand-edit the
// generated file.
//
// Usage: node scripts/generate-stations.mjs

import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RAPID_RAIL_URL = "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl";
const KTMB_URL = "https://api.data.gov.my/gtfs-static/ktmb";

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

// Real abbreviations in the feeds' ALL-CAPS station names that shouldn't
// be title-cased into e.g. "Klcc" or "Uitm".
const KEEP_UPPERCASE = new Set(["KL", "KLCC", "PWTC", "UOB", "IOI", "USJ", "UITM", "UPM", "UKM", "CBP", "SS", "SA"]);

// The upstream feed has "KL SENTRAL - REDONE" for stop KJ15 — an obvious
// leftover from a Prasarana-side data edit, not a real station name.
// Worth patching explicitly (and visibly) rather than shipping it verbatim.
const KNOWN_NAME_FIXES = {
  "KL Sentral - Redone": "KL Sentral",
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
  const lines = clean.split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

// Capitalizes the first *letter*, not just the first character — a plain
// `charAt(0).toUpperCase()` leaves the "S" lowercase in a token like
// "(S)" (a KTM suffix marker) since the first character is "(", not a
// letter at all.
function capitalizeFirstLetter(token) {
  let result = "";
  let capitalized = false;
  for (const ch of token) {
    if (/[a-zA-Z]/.test(ch)) {
      result += capitalized ? ch.toLowerCase() : ch.toUpperCase();
      capitalized = true;
    } else {
      result += ch;
    }
  }
  return result;
}

function caseToken(token) {
  if (token === "") return token;
  if (/^[0-9]+$/.test(token)) return token;
  // Already mixed-case in the source feed (e.g. "SunU", short for Sunway
  // University) — trust it rather than flattening it to "Sunu".
  if (token !== token.toUpperCase() && token !== token.toLowerCase()) return token;
  if (/^[A-Z]{1,4}[0-9]+$/i.test(token)) return token.toUpperCase(); // e.g. USJ7, SS15
  if (KEEP_UPPERCASE.has(token.toUpperCase())) return token.toUpperCase();
  return capitalizeFirstLetter(token);
}

function titleCaseWord(word) {
  // Hyphens act as sub-word boundaries too (e.g. "SOUTH QUAY-USJ" should
  // become "South Quay-USJ", not "South Quay-usj").
  return word.split("-").map(caseToken).join("-");
}

function titleCase(name) {
  return name.trim().replace(/\s+/g, " ").replace(/\S+/g, titleCaseWord);
}

// GTFS times are "H:MM:SS" (or "HH:MM:SS"), and can exceed 24:00:00 for a
// trip that runs past midnight — plain Date parsing chokes on both, so
// just split and sum.
function parseGtfsTime(hms) {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function fetchGtfsFeed(url, destDir) {
  execSync(`curl -sfL "${url}" -o feed.zip && unzip -oq feed.zip -x "__MACOSX/*"`, { cwd: destDir });
  return {
    read: (file) => readFileSync(join(destDir, file), "utf8"),
  };
}

// Shared by both feeds: one line's station order + real scheduled travel
// times, from whichever trip is the best representative of the whole
// line. stops.txt's own row order isn't guaranteed to match the line's
// actual station order, so this always derives it from stop_times.txt
// instead.
function buildLine({ id, name, color, trips, stopTimes, stopById, matchesTrip }) {
  const candidateTripIds = new Set(trips.filter(matchesTrip).map((t) => t.trip_id));
  if (candidateTripIds.size === 0) return null;

  // A route commonly has multiple trip patterns sharing the same
  // direction/service — full-length runs plus short-turn variants that
  // stop partway (e.g. KTM Seremban Line trips that turn back at KL
  // Sentral instead of continuing to Pulau Sebang). Picking the first
  // match risked grabbing a short-turn trip and mistaking it for the
  // whole line, so instead: count stops per candidate trip and take
  // whichever one actually covers the most.
  const stopCountByTrip = new Map();
  for (const st of stopTimes) {
    if (!candidateTripIds.has(st.trip_id)) continue;
    stopCountByTrip.set(st.trip_id, (stopCountByTrip.get(st.trip_id) ?? 0) + 1);
  }
  let tripId;
  let maxStops = 0;
  for (const [candidateId, count] of stopCountByTrip) {
    if (count > maxStops) {
      maxStops = count;
      tripId = candidateId;
    }
  }
  if (!tripId) return null;

  // Built from the same sorted+filtered rows in one pass so `stations`
  // and `arrivalOffsetMinutes` stay index-aligned — computing them
  // separately risks the two arrays silently drifting out of sync if a
  // stop gets filtered differently on one side.
  const rows = stopTimes
    .filter((st) => st.trip_id === tripId)
    .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
    .map((st) => {
      const stop = stopById.get(st.stop_id);
      if (!stop || !st.arrival_time) return null;
      const stopName = titleCase(stop.stop_name);
      return { name: KNOWN_NAME_FIXES[stopName] ?? stopName, arrivalSeconds: parseGtfsTime(st.arrival_time) };
    })
    .filter((row) => row !== null);

  if (rows.length === 0) return null;

  // Minutes from this trip's first stop to each station — real scheduled
  // timetable data, not estimated. A leg's travel time is just the
  // difference between its two stations' offsets (lib/schedule.ts).
  const baseSeconds = rows[0].arrivalSeconds;
  return {
    id,
    name,
    color,
    stations: rows.map((row) => row.name),
    arrivalOffsetMinutes: rows.map((row) => Math.round((row.arrivalSeconds - baseSeconds) / 60)),
  };
}

const tmp = mkdtempSync(join(tmpdir(), "gtfs-"));
try {
  const lines = [];

  // --- Prasarana: LRT/MRT/Monorail/BRT ---
  {
    const dir = join(tmp, "rapid-rail");
    execSync(`mkdir -p "${dir}"`);
    const feed = fetchGtfsFeed(RAPID_RAIL_URL, dir);
    const routes = parseCsv(feed.read("routes.txt")).filter((r) => r.status === "valid");
    const trips = parseCsv(feed.read("trips.txt"));
    const stopTimes = parseCsv(feed.read("stop_times.txt"));
    const stops = parseCsv(feed.read("stops.txt")).filter((s) => s.status === "valid");
    const stopById = new Map(stops.map((s) => [s.stop_id, s]));

    for (const route of routes) {
      const line = buildLine({
        id: RAPID_LINE_ID_SLUG[route.route_id] ?? route.route_id.toLowerCase(),
        name: route.route_long_name,
        color: route.route_color ? `#${route.route_color}` : "#64748b",
        trips,
        stopTimes,
        stopById,
        matchesTrip: (t) => t.route_id === route.route_id && t.direction_id === "0",
      });
      if (line) lines.push(line);
    }
  }

  // --- KTMB: Komuter only (route_type "0"); Intercity/ETS (route_type
  // "2") shares this same feed but isn't relevant to daily commuting ---
  {
    const dir = join(tmp, "ktmb");
    execSync(`mkdir -p "${dir}"`);
    const feed = fetchGtfsFeed(KTMB_URL, dir);
    const routes = parseCsv(feed.read("routes.txt")).filter((r) => r.route_type === "0");
    const trips = parseCsv(feed.read("trips.txt"));
    const stopTimes = parseCsv(feed.read("stop_times.txt"));
    // No `status` column in this feed, unlike Prasarana's — nothing to filter on.
    const stops = parseCsv(feed.read("stops.txt"));
    const stopById = new Map(stops.map((s) => [s.stop_id, s]));

    for (const route of routes) {
      const line = buildLine({
        id: KTMB_LINE_ID_SLUG[route.route_id] ?? route.route_id.toLowerCase(),
        name: `KTM ${route.route_short_name}`,
        color: route.route_color ? `#${route.route_color}` : "#64748b",
        trips,
        stopTimes,
        stopById,
        // Restrict candidates to an explicit weekday service too
        // (calendar.txt has separate komuter_weekday/komuter_weekend
        // service_ids) so a weekend-only schedule quirk can't sneak in.
        matchesTrip: (t) =>
          t.route_id === route.route_id && t.direction_id === "0" && t.service_id === "komuter_weekday",
      });
      if (line) lines.push(line);
    }
  }

  const header = `// Generated from two official GTFS static feeds on data.gov.my
// (https://developer.data.gov.my/realtime-api/gtfs-static) via
// scripts/generate-stations.mjs — don't hand-edit, re-run the script
// instead if the source data changes:
//   - Prasarana (category=rapid-rail-kl): LRT, MRT, KL Monorail, BRT Sunway
//   - KTMB: the two Klang Valley Komuter lines only (route_type "0") —
//     Intercity/ETS long-distance routes in the same feed are excluded
//
// arrivalOffsetMinutes[i] is minutes from stations[0]'s departure to
// stations[i]'s arrival, per one representative weekday trip — real
// scheduled timetable data, used for expected-arrival estimates
// (lib/schedule.ts), not live tracking.
`;

  const body = `export const LINES = ${JSON.stringify(lines, null, 2)} as const;

export type LineId = (typeof LINES)[number]["id"];
`;

  writeFileSync(join(process.cwd(), "lib", "stations.ts"), header + "\n" + body);

  const totalStations = lines.reduce((sum, l) => sum + l.stations.length, 0);
  console.log(`Generated lib/stations.ts: ${lines.length} lines, ${totalStations} station entries.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
