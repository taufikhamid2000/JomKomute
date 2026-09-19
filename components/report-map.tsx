"use client";

// The actual Leaflet map for app/report/page.tsx. Split into its own
// file so the page can `next/dynamic`-import it with `ssr: false` —
// react-leaflet touches `window`/`document` at module load, which would
// otherwise break `next build`'s static export (next.config.ts's
// output: "export" prerenders every route at build time, with no
// browser present).

import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { reportMarkerHtml, type ReportCategoryMeta } from "@/lib/report-categories";
import type { UserReport } from "@/lib/user-reports-client";

// Klang Valley — roughly KL Sentral, a reasonable default center for a
// prototype with no user geolocation wired up yet.
const DEFAULT_CENTER: [number, number] = [3.1339, 101.6869];
const DEFAULT_ZOOM = 12;

function pinIcon(color: string, svg: string) {
  return L.divIcon({
    className: "",
    html: reportMarkerHtml(color, svg),
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function ReportMap({
  reports,
  categories,
  pending,
  onPick,
}: {
  reports: UserReport[];
  categories: ReportCategoryMeta[];
  pending: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const [pendingIcon] = useState(() =>
    L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;border-radius:9999px;background:rgba(37,99,235,0.9);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    }),
  );

  const iconByCategory = useMemo(() => {
    const map = new globalThis.Map<string, L.DivIcon>();
    for (const c of categories) map.set(c.id, pinIcon(c.color, c.svg));
    return map;
  }, [categories]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, NGA, EPA, NPS'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      />
      <ClickCatcher onPick={onPick} />
      {reports.map((r) => {
        const icon = iconByCategory.get(r.category);
        if (!icon) return null;
        return <Marker key={r.id} position={[r.lat, r.lng]} icon={icon} />;
      })}
      {pending ? <Marker position={[pending.lat, pending.lng]} icon={pendingIcon} /> : null}
    </MapContainer>
  );
}
