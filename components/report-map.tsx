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
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { reportMarkerHtml, type ReportCategoryMeta } from "@/lib/report-categories";
import { clusterReports } from "@/lib/report-clusters";
import type { UserReport } from "@/lib/user-reports-client";

// Klang Valley — roughly KL Sentral, a reasonable default center for a
// prototype with no user geolocation wired up yet.
const DEFAULT_CENTER: [number, number] = [3.1339, 101.6869];
const DEFAULT_ZOOM = 12;

// Built per-cluster (not cached by category alone) since the badge count
// varies cluster to cluster — see lib/report-clusters.ts.
function pinIcon(color: string, svg: string, count: number) {
  return L.divIcon({
    className: "",
    html: reportMarkerHtml(color, svg, count),
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

  const categoryById = useMemo(() => new globalThis.Map(categories.map((c) => [c.id, c])), [categories]);
  const clusters = useMemo(() => clusterReports(reports), [reports]);

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
      {clusters.map((cluster) => {
        const meta = categoryById.get(cluster.category);
        if (!meta) return null;
        const icon = pinIcon(meta.color, meta.svg, cluster.reports.length);
        return (
          <Marker key={cluster.id} position={[cluster.lat, cluster.lng]} icon={icon}>
            <Popup>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium">{meta.label}</p>
                {cluster.reports.map((r) => (
                  <p key={r.id} className="text-xs text-foreground/60">
                    {new Date(r.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                ))}
              </div>
            </Popup>
          </Marker>
        );
      })}
      {pending ? <Marker position={[pending.lat, pending.lng]} icon={pendingIcon} /> : null}
    </MapContainer>
  );
}
