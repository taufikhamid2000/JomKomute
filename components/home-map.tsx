"use client";

// The full-screen map behind the Waze-style home screen (app/page.tsx).
// Same "use client" + dynamic-import(ssr:false) pattern as
// components/report-map.tsx / route-map.tsx, for the same reason:
// react-leaflet touches window/document at module load, which would break
// next.config.ts's static export otherwise.
//
// Unlike route-map.tsx (which shows "no coordinates" when a route can't be
// plotted), this always renders a plain map of the Klang Valley — the
// user's Home route (if any) is drawn on top as a bonus, not a requirement.

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { lineById } from "@/lib/lines";
import { LINES, STATION_COORDS } from "@/lib/stations";
import type { RouteLeg } from "@/lib/types";

const DEFAULT_CENTER: [number, number] = [3.1339, 101.6869]; // KL Sentral
const DEFAULT_ZOOM = 12;

function stationIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:10px;height:10px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function stationsForLeg(leg: RouteLeg): string[] {
  const line = lineById(leg.line);
  if (!line) return [leg.originStation, leg.destinationStation];

  const stations = line.stations as readonly string[];
  const originIdx = stations.indexOf(leg.originStation);
  const destIdx = stations.indexOf(leg.destinationStation);
  if (originIdx === -1 || destIdx === -1) return [leg.originStation, leg.destinationStation];

  const slice =
    originIdx <= destIdx
      ? stations.slice(originIdx, destIdx + 1)
      : stations.slice(destIdx, originIdx + 1).reverse();
  return [...slice];
}

// Fits the map to the active route's stations when it's set/changed —
// gives Home/Work tapping the "route just started" feel (polyline drawn
// and framed) instead of leaving the map sitting on its default view.
function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], DEFAULT_ZOOM);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }, [map, points]);
  return null;
}

// The full rail network, drawn thin and faded underneath the active
// route — every consecutive pair of stations on each line that both have
// real coordinates in STATION_COORDS, split into separate segments at
// any gap (a station missing from STATION_COORDS) rather than skipping
// straight across it, same "don't draw a fake straight line over a
// missing stop" rule route-map.tsx's stationsForLeg follows for a single
// route. Computed once (LINES/STATION_COORDS are both static, module-level
// data) and reused across renders instead of every render.
function buildNetworkSegments(): { color: string; points: [number, number][] }[] {
  const segments: { color: string; points: [number, number][] }[] = [];
  for (const line of LINES) {
    let current: [number, number][] = [];
    for (const station of line.stations) {
      const coord = STATION_COORDS[station as string];
      if (!coord) {
        if (current.length > 1) segments.push({ color: line.color, points: current });
        current = [];
        continue;
      }
      current.push(coord);
    }
    if (current.length > 1) segments.push({ color: line.color, points: current });
  }
  return segments;
}

const NETWORK_SEGMENTS = buildNetworkSegments();

export function HomeMap({ legs }: { legs?: RouteLeg[] }) {
  const networkSegments = useMemo(() => NETWORK_SEGMENTS, []);
  const segments = useMemo(() => {
    if (!legs || legs.length === 0) return [];
    return legs.map((leg) => {
      const color = lineById(leg.line)?.color ?? "#64748b";
      const stationNames = stationsForLeg(leg);
      const points = stationNames
        .map((name) => ({ name, coord: STATION_COORDS[name] }))
        .filter((s): s is { name: string; coord: [number, number] } => !!s.coord);
      return { color, points };
    });
  }, [legs]);

  const allPoints = segments.flatMap((s) => s.points);
  const center = allPoints.length > 0 ? allPoints[Math.floor(allPoints.length / 2)].coord : DEFAULT_CENTER;
  const allCoords = useMemo(() => allPoints.map((p) => p.coord), [segments]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapContainer center={center} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {allCoords.length > 0 && <FitToPoints points={allCoords} />}
      {networkSegments.map((segment, i) => (
        <Polyline key={`network-${i}`} positions={segment.points} pathOptions={{ color: segment.color, weight: 2, opacity: 0.35 }} />
      ))}
      {segments.map((segment, i) =>
        segment.points.length > 1 ? (
          <Polyline
            key={i}
            positions={segment.points.map((p) => p.coord)}
            pathOptions={{ color: segment.color, weight: 5 }}
          />
        ) : null
      )}
      {segments.map((segment, si) => {
        const icon = stationIcon(segment.color);
        return segment.points.map((p, pi) => <Marker key={`${si}-${pi}`} position={p.coord} icon={icon} />);
      })}
    </MapContainer>
  );
}
