"use client";

// Waze-style "report an issue" flow, a quick modal over the home screen
// instead of a dedicated map page. Two ways to place a report:
// - "My location": the report's lat/lng is wherever the browser's
//   geolocation says the user is right now (see supabase/migrations/
//   20260919120000_jomkomute_user_reports.sql and
//   20260919140000_..._reporter_location.sql for the table this writes
//   to). This is the original behavior.
// - "Pick a station": lets someone report an issue at a station they
//   know about but aren't standing at right now — e.g. a friend just
//   told them, or they're reporting ahead of their own trip. No
//   geolocation requirement at all in this mode; the reporter's own
//   position (if available) is still recorded as metadata, just not
//   used to gate submission the way it does in "My location" mode.
//   Fillable by typing into the Combobox, or — before this modal is even
//   open — by tapping a station directly on the home screen's own
//   HomeMap (app/page.tsx only makes the map's stations tappable while
//   this modal is closed, and opens it with that station preselected on
//   a tap). This modal draws no map of its own, so there's only ever
//   the one map on screen.
//
// app/report/page.tsx still exists, but only as a browse-and-vote map
// (clusters + "Still happening?" voting) — creating a new report always
// goes through this modal, opened from the home screen's floating report
// button (app/page.tsx).

import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/combobox";
import { reportCategoryMeta } from "@/lib/report-categories";
import {
  nearestCorridorPoint,
  reportableStationOptions,
  routeCorridorPoints,
  REPORT_CORRIDOR_METERS,
  type CorridorPoint,
} from "@/lib/route-corridor";
import { STATION_COORDS } from "@/lib/stations";
import type { RouteLeg } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";
import { submitUserReport, type ReportCategory } from "@/lib/user-reports-client";

// Same limit as the `jomkomute_user_reports` table's
// `coalesce(length(note), 0) <= 280` check constraint — enforced
// client-side too so a submit never round-trips just to be rejected by
// Postgres for a too-long note.
const MAX_NOTE_LENGTH = 280;

type GeoState =
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "unavailable" };

type SubmitState = { status: "idle" } | { status: "submitting" } | { status: "success" } | { status: "error"; message: string };

export function ReportModal({
  legs,
  onClose,
  onSubmitted,
  pickedStation,
  onPickedStationConsumed,
}: {
  // The active route's legs, when the home screen had one selected
  // (app/page.tsx's reportableLegs) — used to scope submission to that
  // route's corridor (Phase 3's REPORT_CORRIDOR_METERS check), same as
  // app/report/page.tsx used to via its ?legs= param. No legs (no active
  // route) means no corridor: submit from wherever, exactly as before
  // Phase 3. The modal itself draws no map/visual guide — the check is
  // silent, surfaced only via an error message on failure.
  legs?: RouteLeg[];
  onClose: () => void;
  onSubmitted?: () => void;
  // A station name app/page.tsx's HomeMap reported back after a direct
  // tap on the map — consumed once (via the effect below) into this
  // modal's own `station` state, then acknowledged with
  // onPickedStationConsumed so the parent clears it and doesn't keep
  // re-delivering the same pick.
  pickedStation?: string | null;
  onPickedStationConsumed?: () => void;
}) {
  const { t } = useDictionary();
  const categories = reportCategoryMeta(t.reportPage.categories);

  const corridor = useMemo<CorridorPoint[]>(() => (legs && legs.length > 0 ? routeCorridorPoints(legs) : []), [legs]);

  // With route context, only that route's own stations are pickable —
  // keeps a route-scoped report actually scoped to that route, same
  // intent as the corridor check "My location" mode still runs below.
  // With no route context, any station on the network is fair game. The
  // same list app/page.tsx passes to HomeMap for "pick on the map" mode,
  // so the Combobox and the map always offer exactly the same stations.
  const stationOptions = useMemo(() => reportableStationOptions(legs), [legs]);

  const [mode, setMode] = useState<"location" | "station">("location");
  const [station, setStation] = useState("");
  const [geo, setGeo] = useState<GeoState>({ status: "loading" });
  const [note, setNote] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  // A tap on the main map (relayed from app/page.tsx) always means "I
  // picked a station" — switch into that mode and adopt it, then tell
  // the parent it's been consumed.
  useEffect(() => {
    if (!pickedStation) return;
    setMode("station");
    setStation(pickedStation);
    onPickedStationConsumed?.();
  }, [pickedStation, onPickedStationConsumed]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ status: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ status: "ready", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGeo({ status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Close automatically a beat after a successful submit, same as the old
  // page's inline success toast, just closing the modal instead of
  // leaving it open indefinitely.
  useEffect(() => {
    if (submitState.status !== "success") return;
    const timer = setTimeout(() => {
      onSubmitted?.();
      onClose();
    }, 1500);
    return () => clearTimeout(timer);
  }, [submitState.status, onClose, onSubmitted]);

  const canSubmit =
    (mode === "location" ? geo.status === "ready" : station !== "") &&
    submitState.status !== "submitting" &&
    submitState.status !== "success";

  async function handleSelectCategory(category: ReportCategory) {
    // "Pick a station" mode: report the station's own coordinates, no
    // geolocation requirement — the whole point is letting someone
    // report somewhere they aren't standing right now, so there's
    // nothing to gate against here. The reporter's own position (if a
    // fix happens to be available) still rides along as metadata, same
    // field "My location" mode uses, just not required or checked.
    if (mode === "station") {
      const coord = STATION_COORDS[station];
      if (!coord) {
        setSubmitState({ status: "error", message: t.reportPage.error });
        return;
      }
      const lineId = corridor.length > 0 ? (nearestCorridorPoint({ lat: coord[0], lng: coord[1] }, corridor)?.point.lineId ?? null) : null;

      setSubmitState({ status: "submitting" });
      try {
        await submitUserReport({
          lat: coord[0],
          lng: coord[1],
          category,
          note: note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : undefined,
          reporterLat: geo.status === "ready" ? geo.lat : null,
          reporterLng: geo.status === "ready" ? geo.lng : null,
          lineId,
        });
        setSubmitState({ status: "success" });
      } catch {
        setSubmitState({ status: "error", message: t.reportPage.error });
      }
      return;
    }

    if (geo.status !== "ready") {
      setSubmitState({ status: "error", message: geo.status === "denied" ? t.reportPage.locationDenied : t.reportPage.locationUnavailable });
      return;
    }

    // Phase 3's corridor check, ported from app/report/page.tsx: with
    // route context (corridor non-empty), the reporter's own position has
    // to actually land near that route — otherwise there'd be nothing
    // stopping a report opened from one route's FAB from being tagged
    // onto an unrelated part of the network. No corridor (no active
    // route on the home screen) skips this entirely. Only applies in
    // "My location" mode — "Pick a station" above scopes itself via
    // stationOptions instead, since the whole mode exists to not be
    // gated on the reporter's own position.
    let lineId: string | null = null;
    if (corridor.length > 0) {
      const nearest = nearestCorridorPoint({ lat: geo.lat, lng: geo.lng }, corridor);
      if (!nearest || nearest.distanceMeters > REPORT_CORRIDOR_METERS) {
        setSubmitState({ status: "error", message: t.reportPage.notOnRoute });
        return;
      }
      lineId = nearest.point.lineId;
    }

    setSubmitState({ status: "submitting" });
    try {
      // No separate "tapped" location anymore — the report is wherever
      // the reporter's own GPS fix says they are, so lat/lng and
      // reporterLat/reporterLng are the same point.
      await submitUserReport({
        lat: geo.lat,
        lng: geo.lng,
        category,
        note: note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : undefined,
        reporterLat: geo.lat,
        reporterLng: geo.lng,
        lineId,
      });
      setSubmitState({ status: "success" });
    } catch {
      setSubmitState({ status: "error", message: t.reportPage.error });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.reportPage.title}
      className="animate-backdrop-in fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex w-full max-w-sm flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-5 sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{t.reportPage.title}</h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
              style={{ backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
            >
              {t.reportPage.conceptBadge}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.reportPage.close}
            className="cursor-pointer rounded-full p-1 text-foreground/50 hover:bg-[var(--nav-hover-bg)] hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-foreground/60">{t.reportPage.modalDescription}</p>

        {submitState.status !== "success" && (
          <div className="flex gap-1 rounded-lg bg-[var(--nav-hover-bg)] p-1">
            <button
              type="button"
              onClick={() => setMode("location")}
              className={
                mode === "location"
                  ? "flex-1 cursor-pointer rounded-md bg-background px-2 py-1.5 text-xs font-medium text-foreground shadow-sm"
                  : "flex-1 cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-foreground/60"
              }
            >
              {t.reportPage.useMyLocation}
            </button>
            <button
              type="button"
              onClick={() => setMode("station")}
              className={
                mode === "station"
                  ? "flex-1 cursor-pointer rounded-md bg-background px-2 py-1.5 text-xs font-medium text-foreground shadow-sm"
                  : "flex-1 cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-foreground/60"
              }
            >
              {t.reportPage.pickStation}
            </button>
          </div>
        )}

        {mode === "location" ? (
          <>
            {geo.status === "loading" ? <p className="text-xs text-foreground/50">{t.reportPage.locationLoading}</p> : null}
            {geo.status === "denied" ? <p className="text-xs text-[var(--destructive)]">{t.reportPage.locationDenied}</p> : null}
            {geo.status === "unavailable" ? <p className="text-xs text-[var(--destructive)]">{t.reportPage.locationUnavailable}</p> : null}
          </>
        ) : (
          submitState.status !== "success" && (
            <Combobox
              value={station}
              onChange={setStation}
              options={stationOptions}
              placeholder={t.reportPage.stationPlaceholder}
              noResultsLabel={t.legsEditor.noStationsFound}
            />
          )
        )}

        {submitState.status === "success" ? (
          <div
            className="rounded-xl px-3 py-2.5 text-center text-sm font-medium"
            style={{ backgroundColor: "color-mix(in srgb, var(--accent) 90%, transparent)", color: "var(--accent-foreground)" }}
          >
            {t.reportPage.success}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => handleSelectCategory(c.id)}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-foreground transition-colors hover:bg-[var(--nav-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: c.color, color: "white" }}
                  >
                    {c.icon}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              placeholder={t.reportPage.notePlaceholder}
              rows={2}
              maxLength={MAX_NOTE_LENGTH}
              disabled={submitState.status === "submitting"}
              className="w-full resize-none rounded-xl border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-foreground/40 disabled:opacity-50"
            />
            <p className="text-right text-[10px] text-foreground/40">
              {note.length}/{MAX_NOTE_LENGTH}
            </p>

            {submitState.status === "submitting" ? (
              <p className="text-center text-xs text-foreground/50">{t.reportPage.submitting}</p>
            ) : null}
            {submitState.status === "error" ? (
              <p className="text-center text-xs text-[var(--destructive)]">{submitState.message}</p>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={onClose} className="cursor-pointer text-xs text-foreground/50 hover:text-foreground">
                {t.reportPage.cancel}
              </button>
              <a href="/report" className="cursor-pointer text-xs text-primary underline-offset-4 hover:underline">
                {t.reportPage.browseReports}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
