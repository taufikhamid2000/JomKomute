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
import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import { lineById } from "@/lib/lines";
import { STATION_COORDS } from "@/lib/stations";
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

export function HomeMap({ legs }: { legs?: RouteLeg[] }) {
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

  return (
    <MapContainer center={center} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {segments.map((segment, i) =>
        segment.points.length > 1 ? (
          <Polyline key={i} positions={segment.points.map((p) => p.coord)} pathOptions={{ color: segment.color, weight: 4 }} />
        ) : null
      )}
      {segments.map((segment, si) => {
        const icon = stationIcon(segment.color);
        return segment.points.map((p, pi) => <Marker key={`${si}-${pi}`} position={p.coord} icon={icon} />);
      })}
    </MapContainer>
  );
}
