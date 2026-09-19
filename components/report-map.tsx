"use client";

// The actual Leaflet map for app/report/page.tsx. Split into its own
// file so the page can `next/dynamic`-import it with `ssr: false` —
// react-leaflet touches `window`/`document` at module load, which would
// otherwise break `next build`'s static export (next.config.ts's
// output: "export" prerenders every route at build time, with no
// browser present).

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { en } from "@/lib/dictionaries/en";
import { reportMarkerHtml, type ReportCategoryMeta } from "@/lib/report-categories";
import { clusterReports } from "@/lib/report-clusters";
import type { CorridorPoint } from "@/lib/route-corridor";
import { getMyVoteFor, submitReportVote, type ReportVote, type UserReport } from "@/lib/user-reports-client";

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

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
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

// One report's row inside a cluster popup: its time, plus a "Still
// happening?" Yes/No once, or a plain confirmation of what this device
// already said (see lib/user-reports-client.ts's getMyVoteFor — purely a
// UI convenience, not authoritative). Its own state (not lifted to
// ReportMap) since each row's vote is independent and popups already
// unmount/remount per Leaflet's own lifecycle.
function ReportVoteRow({ report, t, onVoted }: { report: UserReport; t: ReportPageDictionary; onVoted?: () => void }) {
  const [vote, setVote] = useState<ReportVote | null>(() => getMyVoteFor(report.id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleVote(next: ReportVote) {
    setSubmitting(true);
    setError(false);
    try {
      await submitReportVote(report.id, next);
      setVote(next);
      // A dispute vote can push a report past the visibility threshold
      // (see the jomkomute_user_reports_visible view) — re-fetch so it
      // drops off the map/list live instead of waiting for the next
      // unrelated refresh.
      onVoted?.();
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5 first:border-t-0 first:pt-0">
      <span className="text-xs text-foreground/60">
        {new Date(report.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </span>
      {vote ? (
        <span className="text-xs text-foreground/50">{vote === "confirm" ? t.youConfirmed : t.youDisputed}</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-foreground/50">{t.stillHappening}</span>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleVote("confirm")}
            className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-[var(--nav-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.confirmVote}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleVote("dispute")}
            className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-[var(--nav-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.disputeVote}
          </button>
        </div>
      )}
      {error && <span className="text-xs text-[var(--destructive)]">{t.voteError}</span>}
    </div>
  );
}

export function ReportMap({
  reports,
  categories,
  pending,
  onPick,
  onVoted,
  corridor,
  t,
}: {
  reports: UserReport[];
  categories: ReportCategoryMeta[];
  pending: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  onVoted?: () => void;
  // The active route's corridor, when app/report/page.tsx was reached
  // with route context (Phase 3) — drawn as a visual guide for where a
  // report will actually be accepted (see REPORT_CORRIDOR_METERS in
  // lib/route-corridor.ts, checked at submit time by the page itself).
  // Undefined/empty means no route context: tap anywhere, as before.
  corridor?: CorridorPoint[];
  t: ReportPageDictionary;
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
      {corridorPoints.length > 0 && (
        <>
          <FitToCorridor points={corridorPoints} />
          <Polyline positions={corridorPoints} pathOptions={{ color: "#2563eb", weight: 6, opacity: 0.25 }} />
        </>
      )}
      <ClickCatcher onPick={onPick} />
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
                  <ReportVoteRow key={r.id} report={r} t={t} onVoted={onVoted} />
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
