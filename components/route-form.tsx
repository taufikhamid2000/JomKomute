"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LegsEditor } from "@/components/legs-editor";
import { legsComplete, reverseLegs } from "@/lib/legs";
import { LINES } from "@/lib/lines";
import { useSavedRoutes } from "@/lib/store";
import { DAY_LABELS, type DayOfWeek, type RouteLeg } from "@/lib/types";

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5];

function blankLeg(): RouteLeg {
  return { line: LINES[0].id, originStation: "", destinationStation: "" };
}

export function RouteForm() {
  const router = useRouter();
  const { routes, addRoute } = useSavedRoutes();
  // ?reverseOf=<id> — "Add return trip" on the route detail page links
  // here so the form starts pre-filled with that route's legs reversed,
  // instead of making you rebuild the same commute from scratch.
  const reverseOfId = useSearchParams().get("reverseOf");

  const [legs, setLegs] = useState<RouteLeg[]>([blankLeg()]);
  const [hasAlternate, setHasAlternate] = useState(false);
  const [alternateLegs, setAlternateLegs] = useState<RouteLeg[]>([blankLeg()]);
  const [time, setTime] = useState("07:15");
  const [days, setDays] = useState<Set<DayOfWeek>>(new Set(WEEKDAYS));
  const [label, setLabel] = useState("");
  const [prefilled, setPrefilled] = useState(false);

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
          {prefilled
            ? "Pre-filled with the return trip — reversed legs and days, same departure time to adjust below."
            : "Loading the route to reverse…"}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="label" className="text-sm font-medium text-foreground">
          Route name <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Morning commute"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Route</span>
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
          Add a backup route
        </label>
        <p className="text-xs text-foreground/50">
          E.g. a different line/interchange to use if your usual line has a problem.
        </p>
        {hasAlternate && <LegsEditor legs={alternateLegs} onChange={setAlternateLegs} />}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="time" className="text-sm font-medium text-foreground">
          Usual departure time
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
        <span className="text-sm font-medium text-foreground">Days</span>
        <div className="flex flex-wrap gap-2">
          {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => (
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
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-2 w-fit cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save route
      </button>
    </form>
  );
}
