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
import { MapContainer, Marker, Polyline, Tooltip, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { distanceMeters } from "@/lib/geo-distance";
import { lineById } from "@/lib/lines";
import { NETWORK_SEGMENTS } from "@/lib/network-segments";
import { nearestStationTo } from "@/lib/nearest-station";
import { reportCategoryMeta, reportMarkerHtml } from "@/lib/report-categories";
import { clusterReports } from "@/lib/report-clusters";
import type { RouteOption } from "@/lib/route-finder";
import { STATION_COORDS } from "@/lib/stations";
import type { RouteLeg } from "@/lib/types";
import type { UserReport } from "@/lib/user-reports-client";

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

// Dots marking every reportable station when no route is currently drawn
// (see the `pickableStations` prop below) — a pulsing ring on top of a
// plain dot, so they read clearly as "tap one of these to report an
// issue" even with no other explanation on screen. Not used when a route
// IS drawn — its own stationIcon markers become directly tappable
// instead, rather than doubling up two markers on the same spot.
const PICKABLE_STATION_ICON = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:14px;height:14px;">
    <span class="animate-ping" style="position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,0.35);"></span>
    <div style="position:relative;width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
  </div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// A tap anywhere on the map, while `pickableStations` is set, snaps to
// the nearest one of them (lib/nearest-station.ts) and reports it back —
// covers taps that land near but not exactly on a station marker.
// Together with the per-marker click handlers below, this is what lets
// someone report an issue by tapping a station directly on this map,
// with no separate picker UI (components/report-modal.tsx draws no map
// of its own).
function StationPickCatcher({
  points,
  onPick,
}: {
  points: { name: string; coord: [number, number] }[];
  onPick: (name: string) => void;
}) {
  useMapEvents({
    click(e) {
      const name = nearestStationTo({ lat: e.latlng.lat, lng: e.latlng.lng }, points);
      if (name) onPick(name);
    },
  });
  return null;
}

// Floating duration badge for a route option on the map — the selected
// option gets a bolder, primary-colored pill (Waze's "best route"
// treatment); the rest render lighter, same idea as the thinner/paler
// alternate polylines below.
function durationIcon(label: string, selected: boolean) {
  const border = selected ? "#2563eb" : "#cbd5e1";
  const weight = selected ? "700" : "500";
  const scale = selected ? "1" : "0.92";
  return L.divIcon({
    className: "",
    html: `<div style="transform:scale(${scale});white-space:nowrap;padding:4px 10px;border-radius:9999px;background:white;border:2px solid ${border};box-shadow:0 1px 4px rgba(0,0,0,0.3);font-size:12px;font-weight:${weight};color:#0f172a;">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [20, 12],
  });
}

// Category markers for reports near the currently-shown route — same
// pin-shaped divIcon as components/report-map.tsx's pinIcon, kept small
// and simple here since this is a nice-to-have overlay, not a full
// report-browsing UI.
const CATEGORY_META = reportCategoryMeta({
  delay: "Delay",
  accident: "Accident",
  breakdown: "Breakdown",
  crowded: "Crowded",
  other: "Other",
});
const CATEGORY_META_BY_ID = new Map(CATEGORY_META.map((m) => [m.id, m]));

// Built per-cluster (not cached by category alone) since the badge count
// varies cluster to cluster — see lib/report-clusters.ts.
function reportIcon(category: UserReport["category"], count: number) {
  const meta = CATEGORY_META_BY_ID.get(category);
  const color = meta?.color ?? "#475569";
  const svg = meta?.svg ?? "";
  return L.divIcon({
    className: "",
    html: reportMarkerHtml(color, svg, count),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const REPORT_CORRIDOR_METERS = 300;

// Is `point` within REPORT_CORRIDOR_METERS of any point on `routePoints`?
// A coarse per-point check (no segment interpolation) — good enough for
// station-spaced rail geometry, and keeps this a "nice to have" overlay
// rather than new geometry infrastructure.
function isNearRoute(point: [number, number], routePoints: [number, number][]): boolean {
  return routePoints.some(
    (p) => distanceMeters({ lat: point[0], lng: point[1] }, { lat: p[0], lng: p[1] }) <= REPORT_CORRIDOR_METERS,
  );
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

const MY_LOCATION_ZOOM = 16;

// A blue "you are here" dot, distinct from every other marker style here
// (plain dots for stations, pins for routes, category icons for
// reports) — same pulsing-ring treatment as PICKABLE_STATION_ICON above,
// but a different color so the two are never confused for each other.
const MY_LOCATION_ICON = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:16px;height:16px;">
    <span class="animate-ping" style="position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,0.4);"></span>
    <div style="position:relative;width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45);"></div>
  </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Flies to the reporter's own position whenever it changes — keyed on
// `requestId` (not just lat/lng) so pressing "locate me" again re-centers
// even if the browser hands back the exact same fix as last time.
function FlyToMyLocation({ lat, lng, requestId }: { lat: number; lng: number; requestId: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), MY_LOCATION_ZOOM));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fly on requestId even if lat/lng happen to repeat
  }, [map, requestId]);
  return null;
}


type LegSegment = { color: string; points: { name: string; coord: [number, number] }[] };

function legsToSegments(legs: RouteLeg[]): LegSegment[] {
  return legs.map((leg) => {
    const color = lineById(leg.line)?.color ?? "#64748b";
    const stationNames = stationsForLeg(leg);
    const points = stationNames
      .map((name) => ({ name, coord: STATION_COORDS[name] }))
      .filter((s): s is { name: string; coord: [number, number] } => !!s.coord);
    return { color, points };
  });
}

// A multi-route overview pin: just origin/destination, no legs — used by
// app/routes/page.tsx's mini-map to show where every saved route goes at a
// glance, rather than plotting any one route's full line-by-line path.
export type RoutePin = { originStation: string; destinationStation: string; color?: string };

const ORIGIN_PIN_COLOR = "#2563eb";
const DESTINATION_PIN_COLOR = "#0f172a";

export function HomeMap({
  legs,
  routeOptions,
  selectedOptionIndex,
  onSelectOption,
  reports,
  routePins,
  pickableStations,
  onPickStation,
  showStationNames,
  showReports,
  myLocation,
  onSelectReportCluster,
}: {
  legs?: RouteLeg[];
  routeOptions?: RouteOption[];
  selectedOptionIndex?: number;
  onSelectOption?: (index: number) => void;
  reports?: UserReport[];
  routePins?: RoutePin[];
  // When set (app/page.tsx passes this whenever the report modal isn't
  // open), every station in this list is directly tappable to report an
  // issue there — either by tapping its own marker or, via
  // StationPickCatcher below, by tapping anywhere near it. When a route
  // is also drawn (`legs`/`routeOptions`), this list is expected to be
  // exactly that route's own stations, so no separate overlay is drawn
  // for them (see pickablePoints below) — the route's own dots become
  // clickable instead of drawing a second marker on top.
  pickableStations?: string[];
  onPickStation?: (name: string) => void;
  // "Station names" layer toggle (app/page.tsx's map-layers panel, see
  // lib/map-layer-prefs.ts) — adds a permanent name label to every
  // station marker this map already draws. Doesn't add any new markers
  // of its own, so it's only ever as noisy as whatever's already shown.
  showStationNames?: boolean;
  // "Live reports" layer toggle — hides nearbyReportClusters entirely
  // when false. Defaults to true (undefined means "not passed a
  // preference", not "explicitly off") so every other HomeMap caller
  // (app/routes/page.tsx's mini-map, etc.) keeps its current behavior.
  showReports?: boolean;
  // The reporter's own position, set by app/page.tsx's "locate me"
  // button — renders a "you are here" dot and flies the map there.
  // requestId lets pressing the button again re-fly even to an
  // unchanged position (see FlyToMyLocation above).
  myLocation?: { lat: number; lng: number; requestId: number } | null;
  // Tapping a report marker (see nearbyReportClusters below) resolves it
  // to its nearest station and reports that back — same "open the
  // station popup" destination as onPickStation, just reachable from an
  // existing report instead of tapping a station directly. Deliberately
  // a separate prop rather than reusing onPickStation: viewing a report
  // shouldn't depend on the "Station clickable" layer toggle app/page.tsx
  // gates onPickStation behind.
  onSelectReportCluster?: (station: string) => void;
}) {
  const networkSegments = useMemo(() => NETWORK_SEGMENTS, []);
  const hasOptions = !!routeOptions && routeOptions.length > 0;
  const selectedIndex = selectedOptionIndex ?? 0;
  const hasDrawnRoute = hasOptions || (!!legs && legs.length > 0);

  // Only rendered when there's no route already drawn — with a route
  // shown, pickableStations is that route's own station list, already
  // covered by the (now-clickable) segments/optionSegments markers below.
  const pickablePoints = useMemo(() => {
    if (hasDrawnRoute || !pickableStations || pickableStations.length === 0) return [];
    return pickableStations
      .map((name) => ({ name, coord: STATION_COORDS[name] }))
      .filter((s): s is { name: string; coord: [number, number] } => !!s.coord);
  }, [hasDrawnRoute, pickableStations]);

  // The full pickable set, drawn-route-stations included — for
  // StationPickCatcher, which needs every reportable station regardless
  // of whether it's separately drawn as its own overlay marker.
  const allPickablePoints = useMemo(() => {
    if (!pickableStations || pickableStations.length === 0) return [];
    return pickableStations
      .map((name) => ({ name, coord: STATION_COORDS[name] }))
      .filter((s): s is { name: string; coord: [number, number] } => !!s.coord);
  }, [pickableStations]);

  // Each pin resolves to up to two markers (origin/destination) — stations
  // missing from STATION_COORDS are silently skipped, same "don't draw
  // something we don't have coordinates for" rule the rest of this file
  // follows (see stationsForLeg/buildNetworkSegments).
  const pinMarkers = useMemo(() => {
    if (!routePins || routePins.length === 0) return [];
    return routePins.flatMap((pin, i) => {
      const markers: { key: string; coord: [number, number]; color: string }[] = [];
      const origin = STATION_COORDS[pin.originStation];
      const destination = STATION_COORDS[pin.destinationStation];
      if (origin) markers.push({ key: `pin-${i}-origin`, coord: origin, color: pin.color ?? ORIGIN_PIN_COLOR });
      if (destination) markers.push({ key: `pin-${i}-dest`, coord: destination, color: pin.color ?? DESTINATION_PIN_COLOR });
      return markers;
    });
  }, [routePins]);
  const pinPoints = useMemo(() => pinMarkers.map((m) => m.coord), [pinMarkers]);

  const segments = useMemo(() => {
    if (!legs || legs.length === 0) return [];
    return legsToSegments(legs);
  }, [legs]);

  // Every option's segments, in parallel with routeOptions — used both
  // for drawing and for the badge midpoints below.
  const optionSegments = useMemo(() => {
    if (!hasOptions) return [];
    return routeOptions!.map((option) => legsToSegments(option.legs));
  }, [hasOptions, routeOptions]);

  const singlePoints = useMemo(() => segments.flatMap((s) => s.points).map((p) => p.coord), [segments]);
  const optionsAllPoints = useMemo(
    () => optionSegments.flatMap((segs) => segs.flatMap((s) => s.points.map((p) => p.coord))),
    [optionSegments],
  );

  const fitPoints = hasOptions ? optionsAllPoints : pinPoints.length > 0 ? pinPoints : singlePoints;
  const center = fitPoints.length > 0 ? fitPoints[Math.floor(fitPoints.length / 2)] : DEFAULT_CENTER;

  // The route currently relevant for the "nearby reports" corridor check:
  // the selected option while choosing, otherwise the single committed
  // route (Home/Work/oneTimeRoute).
  const relevantRoutePoints = hasOptions
    ? (optionSegments[selectedIndex] ?? []).flatMap((s) => s.points.map((p) => p.coord))
    : singlePoints;

  // With no route drawn (the idle home screen), there's no corridor to
  // scope by — show every report, same as app/report/page.tsx's
  // browse-and-vote map, rather than silently showing none. Only once a
  // route IS drawn does this narrow down to "reports near this specific
  // route", which is the actual point of relevantRoutePoints.
  const nearbyReports = useMemo(() => {
    if (!reports || reports.length === 0) return [];
    if (relevantRoutePoints.length === 0) return reports;
    return reports.filter((r) => isNearRoute([r.lat, r.lng], relevantRoutePoints));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, relevantRoutePoints]);
  const nearbyReportClusters = useMemo(() => clusterReports(nearbyReports), [nearbyReports]);
  const shouldShowReports = showReports !== false;

  // Every station with known coordinates, regardless of pickableStations
  // — a tapped report marker should resolve to its nearest station even
  // when that station isn't part of the current pickable/route set.
  const allStationPoints = useMemo(
    () => Object.entries(STATION_COORDS).map(([name, coord]) => ({ name, coord })),
    [],
  );

  return (
    <MapContainer center={center} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, NGA, EPA, NPS'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      />
      {fitPoints.length > 0 && <FitToPoints points={fitPoints} />}
      {allPickablePoints.length > 0 && onPickStation && <StationPickCatcher points={allPickablePoints} onPick={onPickStation} />}
      {networkSegments.map((segment, i) => (
        <Polyline key={`network-${i}`} positions={segment.points} pathOptions={{ color: segment.color, weight: 2, opacity: 0.35 }} />
      ))}

      {hasOptions
        ? optionSegments.map((segs, oi) =>
            segs.map((segment, si) =>
              segment.points.length > 1 ? (
                <Polyline
                  key={`opt-${oi}-${si}`}
                  positions={segment.points.map((p) => p.coord)}
                  pathOptions={
                    oi === selectedIndex
                      ? { color: segment.color, weight: 5, opacity: 1 }
                      : { color: segment.color, weight: 3, opacity: 0.45 }
                  }
                />
              ) : null,
            ),
          )
        : segments.map((segment, i) =>
            segment.points.length > 1 ? (
              <Polyline
                key={i}
                positions={segment.points.map((p) => p.coord)}
                pathOptions={{ color: segment.color, weight: 5 }}
              />
            ) : null
          )}

      {hasOptions
        ? optionSegments.map((segs, oi) => {
            if (oi !== selectedIndex) return null;
            return segs.map((segment, si) => {
              const icon = stationIcon(segment.color);
              return segment.points.map((p, pi) => (
                <Marker
                  key={`opt-station-${oi}-${si}-${pi}`}
                  position={p.coord}
                  icon={icon}
                  eventHandlers={onPickStation ? { click: () => onPickStation(p.name) } : undefined}
                >
                  {showStationNames && (
                    <Tooltip permanent direction="top" offset={[0, -6]} opacity={0.9}>
                      {p.name}
                    </Tooltip>
                  )}
                </Marker>
              ));
            });
          })
        : segments.map((segment, si) => {
            const icon = stationIcon(segment.color);
            return segment.points.map((p, pi) => (
              <Marker
                key={`${si}-${pi}`}
                position={p.coord}
                icon={icon}
                eventHandlers={onPickStation ? { click: () => onPickStation(p.name) } : undefined}
              >
                {showStationNames && (
                  <Tooltip permanent direction="top" offset={[0, -6]} opacity={0.9}>
                    {p.name}
                  </Tooltip>
                )}
              </Marker>
            ));
          })}

      {hasOptions &&
        routeOptions!.map((option, i) => {
          const points = optionSegments[i]?.flatMap((s) => s.points.map((p) => p.coord)) ?? [];
          if (points.length === 0) return null;
          const mid = points[Math.floor(points.length / 2)];
          const icon = durationIcon(`${Math.round(option.totalMinutes)} min`, i === selectedIndex);
          return (
            <Marker
              key={`badge-${i}`}
              position={mid}
              icon={icon}
              eventHandlers={{ click: () => onSelectOption?.(i) }}
            />
          );
        })}

      {shouldShowReports &&
        nearbyReportClusters.map((cluster) => (
          <Marker
            key={`report-${cluster.id}`}
            position={[cluster.lat, cluster.lng]}
            icon={reportIcon(cluster.category, cluster.reports.length)}
            eventHandlers={
              onSelectReportCluster
                ? {
                    click: () => {
                      const station = nearestStationTo({ lat: cluster.lat, lng: cluster.lng }, allStationPoints);
                      if (station) onSelectReportCluster(station);
                    },
                  }
                : undefined
            }
          />
        ))}

      {pinMarkers.map((marker) => (
        <Marker key={marker.key} position={marker.coord} icon={stationIcon(marker.color)} />
      ))}

      {onPickStation &&
        pickablePoints.map((s) => (
          <Marker key={`pick-${s.name}`} position={s.coord} icon={PICKABLE_STATION_ICON} eventHandlers={{ click: () => onPickStation(s.name) }}>
            {showStationNames && (
              <Tooltip permanent direction="top" offset={[0, -8]} opacity={0.9}>
                {s.name}
              </Tooltip>
            )}
          </Marker>
        ))}

      {myLocation && (
        <>
          <FlyToMyLocation lat={myLocation.lat} lng={myLocation.lng} requestId={myLocation.requestId} />
          <Marker position={[myLocation.lat, myLocation.lng]} icon={MY_LOCATION_ICON} />
        </>
      )}
    </MapContainer>
  );
}
