"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSavedRoutes } from "@/lib/store";
import { LINES, type LineId } from "@/lib/stations";
import { DAY_LABELS, type DayOfWeek } from "@/lib/types";

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5];

export function RouteForm() {
  const router = useRouter();
  const { addRoute } = useSavedRoutes();

  const [lineId, setLineId] = useState<LineId>(LINES[0].id);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [time, setTime] = useState("07:15");
  const [days, setDays] = useState<Set<DayOfWeek>>(new Set(WEEKDAYS));
  const [label, setLabel] = useState("");

  const line = LINES.find((l) => l.id === lineId) ?? LINES[0];

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination || days.size === 0) return;

    const route = addRoute({
      label: label.trim() || `${origin} → ${destination}`,
      line: line.name,
      originStation: origin,
      destinationStation: destination,
      departureTime: time,
      days: Array.from(days).sort(),
    });
    router.push(`/route?id=${route.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="line" className="text-sm font-medium text-foreground">
          Line
        </label>
        <select
          id="line"
          value={lineId}
          onChange={(e) => {
            setLineId(e.target.value as LineId);
            setOrigin("");
            setDestination("");
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {LINES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="origin" className="text-sm font-medium text-foreground">
            From
          </label>
          <select
            id="origin"
            required
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Select station
            </option>
            {line.stations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="destination" className="text-sm font-medium text-foreground">
            To
          </label>
          <select
            id="destination"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Select station
            </option>
            {line.stations
              .filter((s) => s !== origin)
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </div>
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
        disabled={!origin || !destination || days.size === 0}
        className="mt-2 w-fit cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save route
      </button>
    </form>
  );
}
