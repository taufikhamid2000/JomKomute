"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LINES, STATION_COORDS } from "@/lib/stations";
import { distanceMeters } from "@/lib/geo-distance";
import { linesForStation } from "@/lib/lines";
import type { LineStatus } from "@/lib/line-status";
import type { UserReport } from "@/lib/user-reports-client";
import { useDictionary } from "@/lib/use-dictionary";
import { LogoMark } from "@/components/logo-mark";

// Same dynamic-import reasoning as app/page.tsx: react-leaflet needs a browser.
const HomeMap = dynamic(() => import("@/components/home-map").then((m) => m.HomeMap), { ssr: false });

// Interchanges used when there is no geolocation fix. Distances are
// illustrative, and the UI says so (homeScreen.nearbyDemo).
const DEMO_STATIONS: { name: string; meters: number }[] = [
  { name: "KL Sentral", meters: 240 },
  { name: "Masjid Jamek", meters: 480 },
  { name: "Bukit Bintang", meters: 640 },
];

const WALK_METERS_PER_MIN = 80;
const MAX_NEARBY = 3;

type StatusKind = "normal" | "delayed" | "incident";

function statusKindOf(status: LineStatus | undefined): StatusKind {
  if (!status || status.level === "normal") return "normal";
  return status.worstCategory === "breakdown" || status.worstCategory === "accident" ? "incident" : "delayed";
}

// Colour is never the only signal: each status also gets its own glyph and label.
const STATUS_STYLE: Record<StatusKind, { text: string; glyph: string }> = {
  normal: { text: "text-emerald-700 dark:text-emerald-400", glyph: "●" },
  delayed: { text: "text-amber-700 dark:text-amber-400", glyph: "▲" },
  incident: { text: "text-red-700 dark:text-red-400", glyph: "✖" },
};

function modeLabel(lineName: string): string {
  return lineName.split(" ")[0];
}

function shortLineName(lineName: string): string {
  return lineName.replace(/ Line$/, "");
}

type Nearby = { name: string; meters: number };

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const TILE_ICONS = {
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  status: (
    <>
      <path d="M4 18 9 9l4 5 3-6 4 10" />
      <path d="M4 21h16" />
    </>
  ),
  report: (
    <>
      <path d="M12 3.5 21 19H3L12 3.5Z" />
      <path d="M12 10v4M12 16.8v.2" />
    </>
  ),
  routes: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8v.2" />
    </>
  ),
  pitch: (
    <>
      <path d="M5 4v17" />
      <path d="M5 5h13l-2.5 4L18 13H5" />
    </>
  ),
};

export function HomeDashboard({
  reports,
  lineStatusByLine,
  showReports,
  showStationNames,
  onOpenMap,
  onPlan,
}: {
  reports: UserReport[];
  lineStatusByLine: Map<string, LineStatus>;
  showReports: boolean;
  showStationNames: boolean;
  onOpenMap: () => void;
  onPlan: () => void;
}) {
  const { t } = useDictionary();
  const h = t.homeScreen;
  const [panel, setPanel] = useState<"status" | "map">("map");
  const [nearby, setNearby] = useState<Nearby[]>(DEMO_STATIONS);
  const [isDemoNearby, setIsDemoNearby] = useState(true);
  const [locating, setLocating] = useState(false);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const ranked = Object.entries(STATION_COORDS)
          .map(([name, [lat, lng]]) => ({ name, meters: distanceMeters(here, { lat, lng }) }))
          .sort((a, b) => a.meters - b.meters)
          .slice(0, MAX_NEARBY);
        setNearby(ranked);
        setIsDemoNearby(false);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  // Only auto-locate when the browser already has permission, so opening the
  // home screen never throws an unprompted permission dialog.
  useEffect(() => {
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (!cancelled && p.state === "granted") locate();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles = [
    { href: "/today", label: h.exploreToday, icon: TILE_ICONS.today },
    { href: "/line-status", label: h.exploreStatus, icon: TILE_ICONS.status },
    { href: "/report", label: h.exploreReport, icon: TILE_ICONS.report },
    { href: "/routes", label: h.exploreRoutes, icon: TILE_ICONS.routes },
    { href: "/settings", label: h.exploreSettings, icon: TILE_ICONS.settings },
    { href: "/about", label: h.exploreAbout, icon: TILE_ICONS.about },
    { href: "/pitch", label: h.explorePitch, icon: TILE_ICONS.pitch },
  ];

  const statusLabel: Record<StatusKind, string> = {
    normal: h.statusNormal,
    delayed: h.statusDelayed,
    incident: h.statusIncident,
  };

  return (
    <div className="flex flex-1 flex-col bg-[#1e1b4b]">
      {/* Header band */}
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-14 text-white">
        <div className="flex items-center gap-2">
          <Link
            href="/line-status"
            aria-label={h.alerts}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <IconBase>
              <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
              <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
            </IconBase>
          </Link>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <LogoMark size={22} />
            <span className="max-[420px]:sr-only">{t.nav.brand}</span>
          </span>
        </div>
        <div role="group" aria-label={h.toggleLabel} className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-bold tracking-wide text-emerald-950 uppercase">
            {h.live}
          </span>
          <div className="flex rounded-full bg-white/15 p-1">
            {(["status", "map"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={panel === key}
                onClick={() => setPanel(key)}
                className={`min-h-9 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                  panel === key ? "bg-white text-[#1e1b4b]" : "text-white/90 hover:bg-white/10"
                }`}
              >
                {key === "status" ? h.toggleStatus : h.toggleMap}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content sheet */}
      <div className="-mt-8 flex-1 rounded-t-[2rem] bg-background">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-5 pb-8">
          <button
            type="button"
            onClick={onPlan}
            className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-full border border-border bg-background px-5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-primary">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.75" />
              <path d="m13.5 13.5 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <span className="text-base font-medium text-foreground/80">{h.planJourney}</span>
          </button>

          {panel === "map" ? (
            <section className="relative h-52 overflow-hidden rounded-3xl border border-border shadow-sm [&_.leaflet-control-zoom]:hidden">
              <HomeMap
                reports={reports}
                showReports={showReports}
                showStationNames={showStationNames}
              />
              {/* Transparent button over the map: the card is a preview, not
                  an interactive map; any tap opens the full map view. */}
              <button
                type="button"
                onClick={onOpenMap}
                aria-label={h.expandMap}
                className="absolute inset-0 z-[1000] cursor-pointer rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
              />
            </section>
          ) : (
            <section
              aria-label={h.lineStatusTitle}
              className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm"
            >
              <ul className="divide-y divide-border">
                {LINES.map((line) => {
                  const kind = statusKindOf(lineStatusByLine.get(line.id));
                  const style = STATUS_STYLE[kind];
                  return (
                    <li key={line.id} className="flex min-h-11 items-center gap-3 px-4 py-2.5">
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="flex-1 truncate text-sm font-medium text-foreground">{line.name}</span>
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${style.text}`}>
                        <span aria-hidden="true">{style.glyph}</span>
                        {statusLabel[kind]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Explore more */}
          <section aria-labelledby="home-explore">
            <h2 id="home-explore" className="mb-3 text-lg font-bold text-foreground">
              {h.exploreMore}
            </h2>
            <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
              {tiles.map((tile) => (
                <li key={tile.href} className="shrink-0 snap-start">
                  <Link
                    href={tile.href}
                    className="flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-2xl bg-[#eef0ff] px-1 text-center text-xs font-semibold text-[#1e1b4b] transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {tile.icon && <IconBase>{tile.icon}</IconBase>}
                    <span className="line-clamp-2">{tile.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Nearby stations */}
          <section aria-labelledby="home-nearby">
            <h2 id="home-nearby" className="mb-1 text-lg font-bold text-foreground">
              {h.nearbyTitle}
            </h2>
            {isDemoNearby && (
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className="mb-3 min-h-11 cursor-pointer text-left text-xs text-foreground/70 underline-offset-2 hover:underline disabled:cursor-wait"
              >
                {locating ? h.nearbyLocating : h.nearbyDemo}
              </button>
            )}
            <ul className="flex flex-col gap-3">
              {nearby.map((station) => {
                const minutes = Math.max(1, Math.round(station.meters / WALK_METERS_PER_MIN));
                const lines = linesForStation(station.name);
                return (
                  <li
                    key={station.name}
                    className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                  >
                    <h3 className="text-base font-bold text-foreground">{station.name}</h3>
                    <p className="mb-2 text-xs text-foreground/70">
                      {[...new Set(lines.map((l) => modeLabel(l.name)))].join(" · ")} ·{" "}
                      {h.walkMinutes(minutes)}
                    </p>
                    <ul className="divide-y divide-border">
                      {lines.map((line) => {
                        const kind = statusKindOf(lineStatusByLine.get(line.id));
                        const style = STATUS_STYLE[kind];
                        const terminus = line.stations[line.stations.length - 1];
                        return (
                          <li key={line.id} className="flex min-h-11 items-center gap-3 py-2">
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-bold text-foreground">
                              <span
                                aria-hidden="true"
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: line.color }}
                              />
                              {shortLineName(line.name)}
                            </span>
                            <span className="flex-1 truncate text-sm text-foreground/80">
                              {h.toward(terminus)}
                            </span>
                            <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${style.text}`}>
                              <span aria-hidden="true">{style.glyph}</span>
                              {statusLabel[kind]}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
