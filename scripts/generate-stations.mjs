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

    const orderedStops = stopTimes
      .filter((st) => st.trip_id === tripId)
      .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
      .map((st) => stopById.get(st.stop_id)?.stop_name)
      .filter((name) => !!name)
      .map(titleCase)
      .map((name) => KNOWN_NAME_FIXES[name] ?? name);

    if (orderedStops.length === 0) continue;

    lines.push({
      id: LINE_ID_SLUG[route.route_id] ?? route.route_id.toLowerCase(),
      name: route.route_long_name,
      stations: orderedStops,
    });
  }

  const header = `// Generated from RapidKL's official GTFS static feed
// (https://developer.data.gov.my/realtime-api/gtfs-static, category=rapid-rail-kl)
// via scripts/generate-stations.mjs — covers LRT, MRT, KL Monorail, and
// BRT Sunway. Don't hand-edit; re-run the script if the source changes.
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
