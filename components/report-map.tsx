"use client";

// The actual Leaflet map for app/report/page.tsx, now a browse-and-vote
// view only — creating a new report happens in components/report-modal.tsx
// (opened from the home screen's FAB), not by tapping this map. Split into
// its own file so the page can `next/dynamic`-import it with `ssr: false`
// — react-leaflet touches `window`/`document` at module load, which would
// otherwise break `next build`.

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { ReportRow } from "@/components/report-row";
import type { en } from "@/lib/dictionaries/en";
import { NETWORK_SEGMENTS } from "@/lib/network-segments";
import { reportMarkerHtml, type ReportCategoryMeta } from "@/lib/report-categories";
import { clusterReports } from "@/lib/report-clusters";
import type { CorridorPoint } from "@/lib/route-corridor";
import type { UserReport } from "@/lib/user-reports-client";

type ReportPageDictionary = (typeof en)["reportPage"];

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

// Frames the map on the route corridor (Phase 3's route-scoped reporting)
// when one is present, instead of always sitting on the fixed
// DEFAULT_CENTER — same idea as components/home-map.tsx's FitToPoints.
function FitToCorridor({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }, [map, points]);
  return null;
}

export function ReportMap({
  reports,
  categories,
  onVoted,
  corridor,
  t,
}: {
  reports: UserReport[];
  categories: ReportCategoryMeta[];
  onVoted?: () => void;
  // The active route's corridor, when app/report/page.tsx was reached
  // with route context (Phase 3, still passed via ?legs= from the home
  // screen's "View all reports" link) — drawn as a visual guide only now;
  // there's nothing left on this page to gate against it since reports
  // are created from components/report-modal.tsx instead. Undefined/empty
  // means no route context: just the plain map.
  corridor?: CorridorPoint[];
  t: ReportPageDictionary;
}) {
  const categoryById = useMemo(() => new globalThis.Map(categories.map((c) => [c.id, c])), [categories]);
  const clusters = useMemo(() => clusterReports(reports), [reports]);
  const corridorPoints = useMemo(() => (corridor ?? []).map((c) => c.coord), [corridor]);

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
      {NETWORK_SEGMENTS.map((segment, i) => (
        <Polyline key={`network-${i}`} positions={segment.points} pathOptions={{ color: segment.color, weight: 2, opacity: 0.35 }} />
      ))}
      {corridorPoints.length > 0 && (
        <>
          <FitToCorridor points={corridorPoints} />
          <Polyline positions={corridorPoints} pathOptions={{ color: "#2563eb", weight: 6, opacity: 0.25 }} />
        </>
      )}
      {clusters.map((cluster) => {
        const meta = categoryById.get(cluster.category);
        if (!meta) return null;
        const icon = pinIcon(meta.color, meta.svg, cluster.reports.length);
        return (
          <Marker key={cluster.id} position={[cluster.lat, cluster.lng]} icon={icon}>
            <Popup>
              <div className="flex min-w-[10rem] flex-col gap-1.5">
                <p className="text-xs font-medium">{meta.label}</p>
                {cluster.reports.map((r) => (
                  <ReportRow key={r.id} report={r} t={t} onVoted={onVoted} onDeleted={onVoted} />
                ))}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
