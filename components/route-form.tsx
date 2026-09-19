"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Combobox } from "@/components/combobox";
import { LegsEditor } from "@/components/legs-editor";
import { legsComplete, reverseLegs } from "@/lib/legs";
import { LINES } from "@/lib/lines";
import { useSavedRoutes } from "@/lib/store";
import { type DayOfWeek, type RouteLeg } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";
import { useSingleRouteFinder } from "@/lib/use-route-finder";

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5];
const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

function blankLeg(): RouteLeg {
  return { line: LINES[0].id, originStation: "", destinationStation: "" };
}

export function RouteForm() {
  const { t } = useDictionary();
  const router = useRouter();
  const { routes, addRoute } = useSavedRoutes();
  // ?reverseOf=<id> — "Add return trip" on the route detail page links
  // here so the form starts pre-filled with that route's legs reversed,
  // instead of making you rebuild the same commute from scratch.
  const searchParams = useSearchParams();
  const reverseOfId = searchParams.get("reverseOf");
  // ?prefillLegs=<json> — the home screen's one-time "Where to?" finder
  // hands off here with its ephemeral (never-saved) found legs serialized
  // as JSON, so "Save as a regular route" doesn't make you re-enter the
  // origin/destination it already found. Parallel to reverseOf above (a
  // different prefill source, same idea), not a replacement for it.
  const prefillLegsParam = searchParams.get("prefillLegs");

  const [legs, setLegs] = useState<RouteLeg[]>(() => {
    if (prefillLegsParam) {
      try {
        const parsed = JSON.parse(prefillLegsParam);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as RouteLeg[];
      } catch {
        // fall through to a blank leg below
      }
    }
    return [blankLeg()];
  });
  const [hasAlternate, setHasAlternate] = useState(false);
  const [alternateLegs, setAlternateLegs] = useState<RouteLeg[]>([blankLeg()]);
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

  function handleFindRoute() {
    const result = findRoute();
    if (result) {
      setLegs(result);
      setFinderCollapsed(true);
    }
  }

  useEffect(() => {
    if (!reverseOfId || prefilled) return;
    const source = routes.find((r) => r.id === reverseOfId);
    if (!source) return; // routes hasn't loaded from localStorage yet — retry next render

    setLegs(reverseLegs(source.legs));
    if (source.alternateLegs) {
      setAlternateLegs(reverseLegs(source.alternateLegs));
      setHasAlternate(true);
    }
    setDays(new Set(source.days));
    setPrefilled(true);
  }, [routes, reverseOfId, prefilled]);

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  const canSubmit = legsComplete(legs) && days.size > 0 && (!hasAlternate || legsComplete(alternateLegs));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const route = addRoute({
      label: label.trim() || `${legs[0].originStation} → ${legs[legs.length - 1].destinationStation}`,
      legs,
      alternateLegs: hasAlternate ? alternateLegs : undefined,
      departureTime: time,
      days: Array.from(days).sort(),
    });
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

      {finderCollapsed ? (
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

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.routeForm.routeLabel}</span>
        <LegsEditor legs={legs} onChange={setLegs} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={hasAlternate}
            onChange={(e) => setHasAlternate(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-border"
          />
          {t.routeForm.backupCheckbox}
        </label>
        <p className="text-xs text-foreground/50">{t.routeForm.backupDescription}</p>
        {hasAlternate && <LegsEditor legs={alternateLegs} onChange={setAlternateLegs} />}
      </div>

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
        {t.routeForm.save}
      </button>
    </form>
  );
}
