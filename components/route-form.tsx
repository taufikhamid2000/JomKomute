"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/combobox";
import { formatClockTime, getLineOperatingHours, type LineOperatingHours } from "@/lib/operating-hours-client";
import { findRoute as findRouteLegs } from "@/lib/route-finder";
import { useSavedRoutes } from "@/lib/store";
import { type DayOfWeek, type RouteLeg } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";
import { useSingleRouteFinder } from "@/lib/use-route-finder";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Whether `timeMinutes` falls within [first, last] for one line/day-type,
// treating a last-departure clock time earlier than first (e.g. first
// 06:00, last 01:10) as running past midnight — same normalization as
// lib/operating-hours-client.ts's minutesUntilLastTrain, but also checking
// timeMinutes+1440 so a very-early-morning pick (e.g. 00:30) still reads
// as "within" a late-night run that started the previous day.
function isWithinWindow(first: string | null, last: string | null, timeMinutes: number): boolean {
  if (!first || !last) return true; // unknown hours — don't warn on missing data
  const firstMin = timeToMinutes(first);
  const lastRaw = timeToMinutes(last);
  const lastMin = lastRaw < firstMin ? lastRaw + 1440 : lastRaw;
  return (
    (timeMinutes >= firstMin && timeMinutes <= lastMin) ||
    (timeMinutes + 1440 >= firstMin && timeMinutes + 1440 <= lastMin)
  );
}

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5];
const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

export function RouteForm() {
  const { t } = useDictionary();
  const router = useRouter();
  const { routes, addRoute, updateRoute } = useSavedRoutes();
  // ?reverseOf=<id> — "Add return trip" on the route detail page links
  // here so the form starts pre-filled with that route's origin/
  // destination swapped, instead of making you rebuild the same commute
  // from scratch.
  const searchParams = useSearchParams();
  const reverseOfId = searchParams.get("reverseOf");
  // ?editId=<id> — the route detail page's "Edit" link lands here with an
  // existing route's id so this form doubles as the edit form instead of
  // needing a separate one; same fields, submit calls updateRoute instead
  // of addRoute and returns to the same route's detail page.
  const editId = searchParams.get("editId");
  // ?prefillOrigin=<station>&prefillDestination=<station> — the home
  // screen's one-time "Where to?" finder hands off here with its
  // ephemeral (never-saved) origin/destination, so "Save as a regular
  // route" doesn't make you re-enter what it already found. Parallel to
  // reverseOf above (a different prefill source, same idea), not a
  // replacement for it.
  const prefillOriginParam = searchParams.get("prefillOrigin");
  const prefillDestinationParam = searchParams.get("prefillDestination");

  const [time, setTime] = useState("07:15");
  const [days, setDays] = useState<Set<DayOfWeek>>(new Set(WEEKDAYS));
  const [label, setLabel] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const {
    origin: findOrigin,
    destination: findDestination,
    notFound: findNotFound,
    setOrigin: setFindOrigin,
    setDestination: setFindDestination,
    stationNames,
    find: findRoute,
  } = useSingleRouteFinder();
  const [finderCollapsed, setFinderCollapsed] = useState(false);

  // Recomputed from origin/destination directly (not from the finder's own
  // find(), which only stores a boolean success) so it's available for the
  // operating-hours check below regardless of whether the stations came
  // from the manual finder, ?reverseOf, ?editId, or ?prefillOrigin.
  const [legs, setLegs] = useState<RouteLeg[] | undefined>(undefined);
  useEffect(() => {
    setLegs(findOrigin && findDestination ? findRouteLegs(findOrigin, findDestination) : undefined);
  }, [findOrigin, findDestination]);

  const [operatingHours, setOperatingHours] = useState<LineOperatingHours[]>([]);
  useEffect(() => {
    getLineOperatingHours()
      .then(setOperatingHours)
      .catch(() => {});
  }, []);

  // Non-blocking warning: a rider can still save a route at a time no
  // train actually runs (e.g. 3am when the last train is ~midnight) —
  // this surfaces that rather than silently accepting it, without hard-
  // blocking submission (holiday schedules and other edge cases can make
  // the published hours not quite match reality).
  const hoursWarnings = useMemo(() => {
    if (!legs || legs.length === 0 || operatingHours.length === 0) return [];
    const timeMinutes = timeToMinutes(time);
    const hasWeekday = Array.from(days).some((d) => d >= 1 && d <= 5);
    const hasWeekend = Array.from(days).some((d) => d === 0 || d === 6);
    const lineIds = Array.from(new Set(legs.map((leg) => leg.line)));
    const warnings: { lineName: string; dayType: string; first: string; last: string }[] = [];
    for (const lineId of lineIds) {
      const hours = operatingHours.find((h) => h.lineId === lineId);
      if (!hours) continue;
      if (hasWeekday && !isWithinWindow(hours.weekdayFirst, hours.weekdayLast, timeMinutes)) {
        warnings.push({
          lineName: hours.lineName ?? lineId,
          dayType: t.operatingHoursPage.weekday,
          first: hours.weekdayFirst ?? "?",
          last: hours.weekdayLast ?? "?",
        });
      }
      if (hasWeekend && !isWithinWindow(hours.weekendFirst, hours.weekendLast, timeMinutes)) {
        warnings.push({
          lineName: hours.lineName ?? lineId,
          dayType: t.operatingHoursPage.weekend,
          first: hours.weekendFirst ?? "?",
          last: hours.weekendLast ?? "?",
        });
      }
    }
    return warnings;
    // t.operatingHoursPage.weekday/weekend are stable string values off the
    // dictionary, not worth listing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, operatingHours, time, days]);

  useEffect(() => {
    if (prefillOriginParam) setFindOrigin(prefillOriginParam);
    if (prefillDestinationParam) setFindDestination(prefillDestinationParam);
    if (prefillOriginParam && prefillDestinationParam) setFinderCollapsed(true);
    // Only meant to seed initial state from the URL once, on mount — not
    // meant to re-run as the user edits the fields afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFindRoute() {
    const result = findRoute();
    if (result) setFinderCollapsed(true);
  }

  useEffect(() => {
    if (!reverseOfId || prefilled) return;
    const source = routes.find((r) => r.id === reverseOfId);
    if (!source) return; // routes hasn't loaded from localStorage yet — retry next render

    setFindOrigin(source.destinationStation);
    setFindDestination(source.originStation);
    setFinderCollapsed(true);
    setDays(new Set(source.days));
    setPrefilled(true);
    // setFindOrigin/setFindDestination are stable from useSingleRouteFinder's
    // local useState setters, not worth listing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, reverseOfId, prefilled]);

  useEffect(() => {
    if (!editId || prefilled) return;
    const source = routes.find((r) => r.id === editId);
    if (!source) return; // routes hasn't loaded from localStorage yet — retry next render

    setLabel(source.label);
    setFindOrigin(source.originStation);
    setFindDestination(source.destinationStation);
    setFinderCollapsed(true);
    setDays(new Set(source.days));
    setTime(source.departureTime);
    setPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, editId, prefilled]);

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  const canSubmit = !!findOrigin && !!findDestination && days.size > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const patch = {
      label: label.trim() || `${findOrigin} → ${findDestination}`,
      originStation: findOrigin,
      destinationStation: findDestination,
      departureTime: time,
      days: Array.from(days).sort(),
    };

    if (editId) {
      updateRoute(editId, patch);
      router.push(`/route?id=${editId}`);
      return;
    }

    const route = addRoute(patch);
    router.push(`/route?id=${route.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {reverseOfId && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-foreground/60">
          {prefilled ? t.routeForm.reversePrefilled : t.routeForm.reverseLoading}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="label" className="text-sm font-medium text-foreground">
          {t.routeForm.nameLabel} <span className="font-normal text-foreground/50">{t.routeForm.nameOptional}</span>
        </label>
        <input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t.routeForm.namePlaceholder}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {finderCollapsed && findOrigin && findDestination ? (
        <button
          type="button"
          onClick={() => setFinderCollapsed(false)}
          className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-border bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted"
        >
          <span className="text-sm font-medium text-foreground">
            {t.routeForm.findFoundSummary(findOrigin, findDestination)}
          </span>
          <span className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            {t.routeForm.findChange}
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t.routeForm.findTitle}</p>
            <p className="text-xs text-foreground/50">{t.routeForm.findDescription}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">{t.legsEditor.from}</label>
              <Combobox
                value={findOrigin}
                onChange={setFindOrigin}
                options={stationNames}
                placeholder={t.legsEditor.selectStation}
                noResultsLabel={t.legsEditor.noStationsFound}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">{t.legsEditor.to}</label>
              <Combobox
                value={findDestination}
                onChange={setFindDestination}
                options={stationNames}
                placeholder={t.legsEditor.selectStation}
                noResultsLabel={t.legsEditor.noStationsFound}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleFindRoute}
            disabled={!findOrigin || !findDestination}
            className="w-fit cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.routeForm.findButton}
          </button>
          {findNotFound && <p className="text-xs text-destructive">{t.routeForm.findNotFound}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="time" className="text-sm font-medium text-foreground">
          {t.routeForm.timeLabel}
        </label>
        <input
          id="time"
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {hoursWarnings.map((w, i) => (
          <p key={`${w.lineName}-${w.dayType}-${i}`} className="text-xs text-destructive">
            {t.routeForm.outsideOperatingHours(w.lineName, w.dayType, formatClockTime(w.first), formatClockTime(w.last))}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">{t.routeForm.daysLabel}</span>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={days.has(day)}
              onClick={() => toggleDay(day)}
              className={`h-9 min-w-11 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors ${
                days.has(day)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.days[day]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-2 w-fit cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {editId ? t.routeForm.saveChanges : t.routeForm.save}
      </button>
    </form>
  );
}
