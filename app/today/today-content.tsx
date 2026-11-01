"use client";

// "Today's verdict": for one saved commute, a single answer (go as usual,
// switch lines, or stay home) instead of a map to interpret. The logic
// lives in lib/verdict.ts; this page picks the commute, fetches the live
// rider reports, and lays the answer out. Rendered by app/today/page.tsx,
// which owns the route's metadata.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyIllustration } from "@/components/empty-state";
import { useToast } from "@/components/toast-provider";
import { lineById } from "@/lib/lines";
import { computeNextRoute } from "@/lib/next-route";
import { findRouteOptions } from "@/lib/route-finder";
import { addExceptionRecord, useAllExceptions, useSavedRoutes } from "@/lib/store";
import type { SkipReason } from "@/lib/types";
import type { Dictionary } from "@/lib/dictionaries/en";
import { useDictionary } from "@/lib/use-dictionary";
import { getRecentUserReports, type UserReport } from "@/lib/user-reports-client";
import { computeVerdict, distinguishingLine, type LineAssessment, type OptionAssessment, type Severity } from "@/lib/verdict";

function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  clear: "var(--success, #16a34a)",
  busy: "var(--accent, #d97706)",
  disrupted: "var(--destructive, #dc2626)",
};

function lineName(lineId: string): string {
  return lineById(lineId)?.name ?? lineId;
}

export function TodayContent() {
  const { t } = useDictionary();
  const { showToast } = useToast();
  const { routes } = useSavedRoutes();
  const exceptions = useAllExceptions();

  const [reports, setReports] = useState<UserReport[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pickedRouteId, setPickedRouteId] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const fetchReports = useCallback(
    () =>
      getRecentUserReports()
        .then((r) => {
          setReports(r);
          setLoadFailed(false);
        })
        .catch(() => setLoadFailed(true)),
    [],
  );

  useEffect(() => {
    // Not awaited: the page shows its loading state meanwhile.
    void fetchReports();
  }, [fetchReports]);

  function refresh() {
    setReports(null);
    setLoadFailed(false);
    void fetchReports();
  }

  // Default commute: whichever saved route runs next, so opening the page
  // at 7am lands on the 7:30 trip without a tap.
  const defaultNext = useMemo(() => computeNextRoute(routes, exceptions, now), [routes, exceptions, now]);
  const route = routes.find((r) => r.id === pickedRouteId) ?? defaultNext?.route ?? routes[0];
  const next = useMemo(() => (route ? computeNextRoute([route], exceptions, now) : null), [route, exceptions, now]);

  const options = useMemo(() => (route ? findRouteOptions(route.originStation, route.destinationStation) : undefined), [route]);
  const verdict = useMemo(() => (reports ? computeVerdict(options, reports) : null), [options, reports]);

  const todayIso = localIsoDate(now);
  const skipReasonLabels: Record<SkipReason, string> = {
    leave: t.changePlanModal.onLeave,
    wfh: t.changePlanModal.wfh,
    drive: t.changePlanModal.drive,
  };
  const skippedToday = route
    ? exceptions.find((e) => e.routeId === route.id && e.type === "skip" && e.date === todayIso && e.reason)
    : undefined;

  function markWfh() {
    // Same whole-day skip the home screen's "Change plan" modal applies:
    // every saved route, both directions.
    const date = next?.date ?? todayIso;
    for (const r of routes) addExceptionRecord({ routeId: r.id, type: "skip", date, reason: "wfh" });
    showToast(t.todayPage.wfhDone);
  }

  const categoryLabel = (lineAssessment: LineAssessment) =>
    lineAssessment.status.worstCategory ? t.reportPage.categories[lineAssessment.status.worstCategory] : "";

  if (routes.length === 0) {
    return (
      <AppShell title={t.todayPage.title}>
        <div className="animate-page-in flex w-full flex-col gap-4">
          <Link
            href="/new"
            className="press flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-surface-tint p-6 text-center hover:border-primary/40"
          >
            <EmptyIllustration />
            <span className="text-base font-semibold text-foreground">{t.todayPage.noRoutesTitle}</span>
            <span className="text-sm text-foreground/70">{t.todayPage.noRoutesDescription}</span>
            <span className="mt-1 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              {t.todayPage.noRoutesCta}
            </span>
          </Link>
        </div>
      </AppShell>
    );
  }

  const whenLabel = next
    ? next.date === todayIso
      ? t.todayPage.today
      : next.departureAt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    : null;

  return (
    <AppShell title={t.todayPage.title}>
      <div className="animate-page-in flex w-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-foreground/70">{t.todayPage.subtitle}</p>
          <button
            type="button"
            onClick={refresh}
            className="min-h-11 shrink-0 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t.todayPage.refresh}
          </button>
        </div>

        {routes.length > 1 && (
          <div role="radiogroup" aria-label={t.todayPage.pickRoute} className="flex gap-2 overflow-x-auto pb-1">
            {routes.map((r) => {
              const selected = r.id === route?.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPickedRouteId(r.id)}
                  className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        )}

        {route && (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              {route.originStation} <span aria-hidden="true">→</span> {route.destinationStation}
            </span>
            <span className="text-xs text-foreground/60">
              {next && whenLabel ? t.todayPage.nextTrip(whenLabel, route.departureTime) : t.todayPage.notScheduled}
            </span>
          </div>
        )}

        {skippedToday && skippedToday.type === "skip" && skippedToday.reason && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-foreground">
            {t.todayPage.skippedToday(skipReasonLabels[skippedToday.reason])}
          </p>
        )}

        {loadFailed ? (
          <p className="rounded-xl border border-border p-4 text-sm text-destructive">{t.todayPage.loadError}</p>
        ) : reports === null ? (
          <div className="h-32 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-label={t.todayPage.loading} />
        ) : !verdict ? (
          <p className="rounded-xl border border-border p-4 text-sm text-foreground/70">{t.todayPage.noPath}</p>
        ) : (
          <>
            <VerdictCard t={t} verdict={verdict} categoryLabel={categoryLabel} />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={markWfh}
                className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90 ${
                  verdict.kind === "stay" ? "bg-primary text-primary-foreground" : "border border-border text-foreground"
                }`}
              >
                {t.todayPage.wfhAction}
              </button>
              <Link
                href="/report"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {t.todayPage.reportAction}
              </Link>
            </div>

            <section className="flex flex-col gap-2">
              <h2 className="text-[10px] font-medium tracking-wide text-foreground/50 uppercase">{t.todayPage.optionsTitle}</h2>
              {verdict.options.map((o, i) => (
                <OptionRow
                  key={i}
                  t={t}
                  option={o}
                  isUsual={i === 0}
                  isPick={
                    (verdict.kind === "switch" && o === verdict.best) || (verdict.kind === "go" && o === (verdict.tip ?? verdict.usual))
                  }
                  categoryLabel={categoryLabel}
                />
              ))}
            </section>

            <p className="text-[11px] text-foreground/50">{t.todayPage.basis(reports.length)}</p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function worstLine(option: OptionAssessment): LineAssessment {
  const rank: Record<Severity, number> = { clear: 0, busy: 1, disrupted: 2 };
  return option.lines.reduce((a, b) => (rank[b.severity] > rank[a.severity] || (rank[b.severity] === rank[a.severity] && b.status.count > a.status.count) ? b : a));
}

function VerdictCard({
  t,
  verdict,
  categoryLabel,
}: {
  t: Dictionary;
  verdict: NonNullable<ReturnType<typeof computeVerdict>>;
  categoryLabel: (l: LineAssessment) => string;
}) {
  let title: string;
  let body: string;
  let severity: Severity;

  if (verdict.kind === "go") {
    severity = verdict.usual.severity;
    title = t.todayPage.goTitle;
    body = verdict.tip
      ? t.todayPage.goBusyTip(lineName(distinguishingLine(verdict.tip, verdict.usual)))
      : t.todayPage.goBody(lineName(verdict.usual.option.legs[0].line));
  } else if (verdict.kind === "switch") {
    severity = "clear";
    const worst = worstLine(verdict.usual);
    title = t.todayPage.switchTitle(lineName(distinguishingLine(verdict.best, verdict.usual)));
    body = t.todayPage.switchBody(lineName(worst.lineId), worst.status.count, categoryLabel(worst));
  } else {
    severity = "disrupted";
    title = t.todayPage.stayTitle;
    body = t.todayPage.stayBody;
  }

  return (
    <div
      className="flex flex-col gap-1.5 rounded-2xl border p-5"
      style={{
        borderColor: `color-mix(in srgb, ${SEVERITY_COLOR[severity]} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${SEVERITY_COLOR[severity]} 10%, transparent)`,
      }}
      aria-live="polite"
    >
      <span className="text-2xl font-bold text-foreground">{title}</span>
      <span className="text-sm text-foreground/75">{body}</span>
    </div>
  );
}

function OptionRow({
  t,
  option,
  isUsual,
  isPick,
  categoryLabel,
}: {
  t: Dictionary;
  option: OptionAssessment;
  isUsual: boolean;
  isPick: boolean;
  categoryLabel: (l: LineAssessment) => string;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 ${isPick ? "border-primary" : "border-border"}`}>
      <div className="flex items-center gap-2 text-xs text-foreground/60">
        <span>{t.todayPage.minutes(Math.round(option.option.totalMinutes))}</span>
        <span aria-hidden="true">·</span>
        <span>{t.todayPage.transfers(option.option.transfers)}</span>
        <span className="ml-auto flex gap-1">
          {isUsual && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">{t.todayPage.usualBadge}</span>}
          {isPick && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground uppercase">
              {t.todayPage.pickBadge}
            </span>
          )}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {option.option.legs.map((leg, i) => {
          const assessment = option.lines.find((l) => l.lineId === leg.line);
          const line = lineById(leg.line);
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1 h-3 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: line?.color ?? "currentColor" }} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-foreground">{line?.name ?? leg.line}</span>
                <span className="text-xs text-foreground/60">
                  {leg.originStation} <span aria-hidden="true">→</span> {leg.destinationStation}
                </span>
              </span>
              {assessment && (
                <span className="shrink-0 text-xs font-medium" style={{ color: SEVERITY_COLOR[assessment.severity] }}>
                  {assessment.status.count === 0
                    ? t.todayPage.lineClear
                    : t.todayPage.lineReports(assessment.status.count, categoryLabel(assessment))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
