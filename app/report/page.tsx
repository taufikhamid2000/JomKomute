"use client";

// Waze-style "tap to report" prototype: tap the map, pick an issue type,
// it's inserted straight into Supabase (lib/user-reports-client.ts) and
// shows up for everyone else within 24h. See supabase/migrations/
// 20260919120000_jomkomute_user_reports.sql for the table + RLS this
// relies on, and that file's header for the "prototype, not hardened"
// caveats (anonymous, unmoderated, spoofable by design for now).

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { useDictionary } from "@/lib/use-dictionary";
import { reportCategoryMeta } from "@/lib/report-categories";
import { distanceMeters } from "@/lib/geo-distance";
import { getRecentUserReports, submitUserReport, type ReportCategory, type UserReport } from "@/lib/user-reports-client";

// Reports are meant to reflect what's actually happening where you are,
// not something you saw on the news or are guessing about from home — so
// submission is gated on the browser's own geolocation, within this much
// of the tapped point. Transit lines/stations are places people stand
// *near*, not exactly on top of (GPS drift, standing across the street,
// etc.), so this is deliberately loose rather than a tight "you must be
// standing on the line" radius.
const MAX_REPORT_DISTANCE_METERS = 500;

type GeoState =
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "unavailable" };

// react-leaflet reaches for `window` at import time, which breaks
// `next build`'s static export (next.config.ts's output: "export"
// prerenders this route with no browser present) — ssr: false keeps it
// out of that pass entirely, same as any other browser-only widget here.
const ReportMap = dynamic(() => import("@/components/report-map").then((m) => m.ReportMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-foreground/40">Loading map…</div>
  ),
});

type SubmitState = { status: "idle" } | { status: "submitting" } | { status: "success" } | { status: "error"; message: string };

export default function ReportPage() {
  const { t } = useDictionary();
  const categories = reportCategoryMeta(t.reportPage.categories);

  const [reports, setReports] = useState<UserReport[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [geo, setGeo] = useState<GeoState>({ status: "loading" });

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

  const refresh = useCallback(() => {
    getRecentUserReports()
      .then((rows) => {
        setReports(rows);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (submitState.status !== "success") return;
    const timer = setTimeout(() => setSubmitState({ status: "idle" }), 2500);
    return () => clearTimeout(timer);
  }, [submitState.status]);

  function handlePick(lat: number, lng: number) {
    setPending({ lat, lng });
    setSubmitState({ status: "idle" });
  }

  async function handleSelectCategory(category: ReportCategory) {
    if (!pending) return;

    // Belt and suspenders: the category buttons are already disabled
    // while geo isn't ready (see canSubmit below), but re-check here too
    // rather than trusting that disabled state alone — this is the
    // actual gate.
    if (geo.status !== "ready") {
      setSubmitState({ status: "error", message: geo.status === "denied" ? t.reportPage.locationDenied : t.reportPage.locationUnavailable });
      return;
    }

    const distance = distanceMeters({ lat: geo.lat, lng: geo.lng }, pending);
    if (distance > MAX_REPORT_DISTANCE_METERS) {
      setSubmitState({ status: "error", message: t.reportPage.tooFar });
      return;
    }

    setSubmitState({ status: "submitting" });
    try {
      await submitUserReport({ lat: pending.lat, lng: pending.lng, category, reporterLat: geo.lat, reporterLng: geo.lng });
      setPending(null);
      setSubmitState({ status: "success" });
      refresh();
    } catch {
      setSubmitState({ status: "error", message: t.reportPage.error });
    }
  }

  const canSubmit = geo.status === "ready";

  return (
    <Shell>
      <div className="animate-page-in flex w-full flex-1 flex-col gap-4 p-4 md:p-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">{t.reportPage.title}</h1>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
              style={{ backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
            >
              {t.reportPage.conceptBadge}
            </span>
          </div>
          <p className="max-w-lg text-sm text-foreground/60">{t.reportPage.description}</p>
          {loadError ? <p className="text-sm text-[var(--destructive)]">{t.reportPage.loadError}</p> : null}
          {geo.status === "loading" ? <p className="text-sm text-foreground/50">{t.reportPage.locationLoading}</p> : null}
          {geo.status === "denied" ? <p className="text-sm text-[var(--destructive)]">{t.reportPage.locationDenied}</p> : null}
          {geo.status === "unavailable" ? <p className="text-sm text-[var(--destructive)]">{t.reportPage.locationUnavailable}</p> : null}
        </div>

        <div className="relative mx-auto h-[60vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border">
          <ReportMap reports={reports} categories={categories} pending={pending} onPick={handlePick} />

          {pending ? (
            <div className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{t.reportPage.pickPrompt}</p>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="cursor-pointer text-xs text-foreground/50 hover:text-foreground"
                >
                  {t.reportPage.cancel}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={submitState.status === "submitting" || !canSubmit}
                    onClick={() => handleSelectCategory(c.id)}
                    className="flex flex-1 min-w-[5.5rem] cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-foreground transition-colors hover:bg-[var(--nav-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
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

              {submitState.status === "submitting" ? (
                <p className="text-center text-xs text-foreground/50">{t.reportPage.submitting}</p>
              ) : null}
              {submitState.status === "error" ? (
                <p className="text-center text-xs text-[var(--destructive)]">{submitState.message}</p>
              ) : null}
            </div>
          ) : null}

          {submitState.status === "success" ? (
            <div className="absolute inset-x-0 top-0 z-[1000] flex justify-center p-3">
              <div
                className="rounded-full px-3 py-1.5 text-xs font-medium shadow"
                style={{ backgroundColor: "color-mix(in srgb, var(--accent) 90%, transparent)", color: "var(--accent-foreground)" }}
              >
                {t.reportPage.success}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-wrap gap-3 text-xs text-foreground/50">
          {categories.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: c.color, color: "white" }}>
                <span className="scale-[0.6]">{c.icon}</span>
              </span>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </Shell>
  );
}
