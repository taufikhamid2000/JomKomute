#!/usr/bin/env node
// Regenerates lib/stations.ts from RapidKL's official GTFS static feed
// (https://developer.data.gov.my/realtime-api/gtfs-static, category=
// rapid-rail-kl) — covers LRT, MRT, KL Monorail, and BRT Sunway in one
// feed. Re-run this if the source data changes; don't hand-edit the
// generated file.
//
// Usage: node scripts/generate-stations.mjs

import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GTFS_URL = "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl";

const LINE_ID_SLUG = {
  AG: "ampang",
  KJ: "kelana-jaya",
  PH: "sri-petaling",
  KGL: "kajang",
  PYL: "putrajaya",
  MR: "monorail",
  BRT: "brt-sunway",
  SA: "shah-alam",
};

// Real abbreviations in the feed's ALL-CAPS station names that shouldn't
// be title-cased into e.g. "Klcc" or "Uitm".
const KEEP_UPPERCASE = new Set(["KL", "KLCC", "PWTC", "UOB", "IOI", "USJ", "UITM", "UPM", "CBP", "SS", "SA"]);

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

function caseToken(token) {
  if (token === "") return token;
  if (/^[0-9]+$/.test(token)) return token;
  // Already mixed-case in the source feed (e.g. "SunU", short for Sunway
  // University) — trust it rather than flattening it to "Sunu".
  if (token !== token.toUpperCase() && token !== token.toLowerCase()) return token;
  if (/^[A-Z]{1,4}[0-9]+$/i.test(token)) return token.toUpperCase(); // e.g. USJ7, SS15
  if (KEEP_UPPERCASE.has(token.toUpperCase())) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
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

const tmp = mkdtempSync(join(tmpdir(), "gtfs-"));
try {
  execSync(`curl -sfL "${GTFS_URL}" -o feed.zip && unzip -oq feed.zip -x "__MACOSX/*"`, { cwd: tmp });

  const routes = parseCsv(readFileSync(join(tmp, "routes.txt"), "utf8")).filter((r) => r.status === "valid");
  const trips = parseCsv(readFileSync(join(tmp, "trips.txt"), "utf8"));
  const stopTimes = parseCsv(readFileSync(join(tmp, "stop_times.txt"), "utf8"));
  const stops = parseCsv(readFileSync(join(tmp, "stops.txt"), "utf8")).filter((s) => s.status === "valid");
  const stopById = new Map(stops.map((s) => [s.stop_id, s]));

  // One representative trip per route (direction_id "0") to read a real
  // stop_sequence from — stops.txt's own row order isn't guaranteed to
  // match the line's actual station order.
  const tripIdByRoute = new Map();
  for (const t of trips) {
    if (!tripIdByRoute.has(t.route_id) && t.direction_id === "0") {
      tripIdByRoute.set(t.route_id, t.trip_id);
    }
  }

  const lines = [];
  for (const route of routes) {
    const tripId = tripIdByRoute.get(route.route_id);
    if (!tripId) continue;

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
        const name = titleCase(stop.stop_name);
        return { name: KNOWN_NAME_FIXES[name] ?? name, arrivalSeconds: parseGtfsTime(st.arrival_time) };
      })
      .filter((row) => row !== null);

    if (rows.length === 0) continue;

    // Minutes from this trip's first stop to each station — real
    // scheduled timetable data, not estimated. A leg's travel time is
    // just the difference between its two stations' offsets (lib/schedule.ts).
    const baseSeconds = rows[0].arrivalSeconds;
    const arrivalOffsetMinutes = rows.map((row) => Math.round((row.arrivalSeconds - baseSeconds) / 60));

    lines.push({
      id: LINE_ID_SLUG[route.route_id] ?? route.route_id.toLowerCase(),
      name: route.route_long_name,
      color: route.route_color ? `#${route.route_color}` : "#64748b",
      stations: rows.map((row) => row.name),
      arrivalOffsetMinutes,
    });
  }

  const header = `// Generated from RapidKL's official GTFS static feed
// (https://developer.data.gov.my/realtime-api/gtfs-static, category=rapid-rail-kl)
// via scripts/generate-stations.mjs — covers LRT, MRT, KL Monorail, and
// BRT Sunway. Don't hand-edit; re-run the script if the source changes.
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
