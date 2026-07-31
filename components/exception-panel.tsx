"use client";

import { useState } from "react";
import { useExceptions } from "@/lib/store";
import { DAY_LABELS, type DayOfWeek } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExceptionPanel({ routeId, routeDays }: { routeId: string; routeDays: DayOfWeek[] }) {
  const { exceptions, addException, removeException } = useExceptions(routeId);
  const [eventDate, setEventDate] = useState("");
  const [eventNote, setEventNote] = useState("");

  const today = todayIso();
  const skippedToday = exceptions.some((e) => e.type === "skip" && e.date === today);

  function toggleSkipToday() {
    const existing = exceptions.find((e) => e.type === "skip" && e.date === today);
    if (existing) removeException(existing.id);
    else addException({ routeId, type: "skip", date: today });
  }

  function toggleRecurringSkip(day: DayOfWeek) {
    const existing = exceptions.find((e) => e.type === "recurring-skip" && e.dayOfWeek === day);
    if (existing) removeException(existing.id);
    else addException({ routeId, type: "recurring-skip", dayOfWeek: day });
  }

  function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventDate || !eventNote.trim()) return;
    addException({ routeId, type: "event", date: eventDate, note: eventNote.trim() });
    setEventDate("");
    setEventNote("");
  }

  const recurringSkips = exceptions.filter((e) => e.type === "recurring-skip");
  const events = exceptions
    .filter((e) => e.type === "event")
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Not commuting today?</p>
          <p className="text-xs text-foreground/50">Skips just today — doesn&apos;t change the regular schedule.</p>
        </div>
        <button
          type="button"
          aria-pressed={skippedToday}
          onClick={toggleSkipToday}
          className={`h-9 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors ${
            skippedToday ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground/70 hover:text-foreground"
          }`}
        >
          {skippedToday ? "Skipping today" : "Skip today"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">Recurring day off (e.g. WFH)</p>
        <div className="flex flex-wrap gap-2">
          {routeDays.map((day) => {
            const isSkipped = recurringSkips.some((e) => e.dayOfWeek === day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={isSkipped}
                onClick={() => toggleRecurringSkip(day)}
                className={`h-9 min-w-11 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors ${
                  isSkipped ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground/60 hover:text-foreground"
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">Flag an event day</p>
        <p className="text-xs text-foreground/50">
          E.g. a match or concert near this route that&apos;s likely to add crowding.
        </p>
        <form onSubmit={addEvent} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            type="text"
            value={eventNote}
            onChange={(e) => setEventNote(e.target.value)}
            placeholder="e.g. Bukit Jalil match"
            required
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Add
          </button>
        </form>
        {events.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1.5">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm text-foreground/70">
                <span>
                  {e.date} — {e.note}
                </span>
                <button
                  type="button"
                  onClick={() => removeException(e.id)}
                  className="cursor-pointer text-xs text-foreground/40 underline-offset-4 hover:text-destructive hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
