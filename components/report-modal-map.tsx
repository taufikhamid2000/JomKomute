"use client";

// A small tap-to-pick map for components/report-modal.tsx's "Pick a
// station" mode — lets someone select a station visually instead of only
// typing into the Combobox next to it (both drive the same `station`
// state in the modal). Split into its own file so report-modal.tsx can
// `next/dynamic`-import it with `ssr: false`, same reason every other
// Leaflet-using component here does: react-leaflet touches
// `window`/`document` at module load, which breaks server rendering.
//
// Tapping doesn't drop a pin at the exact tapped point the way the old
// (pre-modal) tap-to-report flow did — it snaps to whichever pickable
// station is nearest the tap. That keeps this consistent with the
// Combobox right next to it: both always resolve to one of `stations`,
// so the submitted report is always exactly a station's own coordinates,
// never an arbitrary point.

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { distanceMeters } from "@/lib/geo-distance";
import { NETWORK_SEGMENTS } from "@/lib/network-segments";
import { STATION_COORDS } from "@/lib/stations";

const DEFAULT_CENTER: [number, number] = [3.1339, 101.6869]; // KL Sentral
const DEFAULT_ZOOM = 12;

const STATION_DOT_ICON = L.divIcon({
  className: "",
  html: `<div style="width:8px;height:8px;border-radius:9999px;background:#94a3b8;border:1.5px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.35);"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

const SELECTED_STATION_ICON = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function nearestStation(point: { lat: number; lng: number }, stations: { name: string; coord: [number, number] }[]): string | null {
  let best: { name: string; d: number } | null = null;
  for (const s of stations) {
    const d = distanceMeters(point, { lat: s.coord[0], lng: s.coord[1] });
    if (!best || d < best.d) best = { name: s.name, d };
  }
  return best?.name ?? null;
}

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
  }, [map, points]);
  return null;
}

export function ReportModalMap({
  stations,
  selected,
  onSelect,
}: {
  // The pickable station list — already scoped to the active route's
  // corridor by report-modal.tsx when there is one, or every station on
  // the network when there isn't.
  stations: string[];
  selected: string;
  onSelect: (station: string) => void;
}) {
  const stationPoints = useMemo(
    () =>
      stations
        .map((name) => ({ name, coord: STATION_COORDS[name] }))
        .filter((s): s is { name: string; coord: [number, number] } => !!s.coord),
    [stations],
  );
  const fitPoints = useMemo(() => stationPoints.map((s) => s.coord), [stationPoints]);

  function handlePick(lat: number, lng: number) {
    const name = nearestStation({ lat, lng }, stationPoints);
    if (name) onSelect(name);
  }

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, NGA, EPA, NPS'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      />
      {/* Only when scoped to a route (fewer than the whole network) is
          fitting to it useful — fitting to every station on the full
          network would just always land on the same citywide view. */}
      {fitPoints.length > 0 && fitPoints.length < 20 && <FitToPoints points={fitPoints} />}
      {NETWORK_SEGMENTS.map((segment, i) => (
        <Polyline key={`network-${i}`} positions={segment.points} pathOptions={{ color: segment.color, weight: 2, opacity: 0.35 }} />
      ))}
      <ClickCatcher onPick={handlePick} />
      {stationPoints.map((s) => (
        <Marker
          key={s.name}
          position={s.coord}
          icon={s.name === selected ? SELECTED_STATION_ICON : STATION_DOT_ICON}
          eventHandlers={{ click: () => onSelect(s.name) }}
        />
      ))}
    </MapContainer>
  );
}
