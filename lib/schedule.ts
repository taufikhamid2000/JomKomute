import { lineById } from "@/lib/lines";
import type { RouteLeg } from "@/lib/types";

// No official minimum-transfer-time data exists per interchange (walking
// distance varies — compare Glenmarie's ~230m walkway to a same-platform
// change), so one flat estimate stands in for all of them rather than
// pretending to a precision the data doesn't support.
const TRANSFER_BUFFER_MINUTES = 5;

// Minutes to ride `leg`'s line from its origin to its destination, from
// real GTFS scheduled timetable data (lib/stations.ts's
// arrivalOffsetMinutes) — not live tracking, so this is a typical run,
// not "the 7:15 train is delayed today." Math.abs handles either
// direction along the line, since we only captured one direction's
// timetable and travel time is assumed roughly symmetric.
export function legTravelMinutes(leg: RouteLeg): number | undefined {
  const line = lineById(leg.line);
  if (!line) return undefined;
  const originIndex = line.stations.findIndex((s) => s === leg.originStation);
  const destIndex = line.stations.findIndex((s) => s === leg.destinationStation);
  if (originIndex === -1 || destIndex === -1) return undefined;
  return Math.abs(line.arrivalOffsetMinutes[destIndex] - line.arrivalOffsetMinutes[originIndex]);
}

// Arrival time (HH:MM) at the destination of each leg, walking the whole
// journey forward from `departureTime` — leg N's arrival becomes leg
// N+1's departure, plus a transfer buffer in between. Returns undefined
// (not a partial array) if any leg's travel time can't be computed, so
// callers don't have to reason about a mix of real and missing values.
export function legArrivalTimes(departureTime: string, legs: RouteLeg[]): string[] | undefined {
  let minutes = timeToMinutes(departureTime);
  const arrivals: string[] = [];
  for (let i = 0; i < legs.length; i++) {
    const travel = legTravelMinutes(legs[i]);
    if (travel === undefined) return undefined;
    minutes += travel;
    arrivals.push(minutesToTime(minutes));
    if (i < legs.length - 1) minutes += TRANSFER_BUFFER_MINUTES;
  }
  return arrivals;
}

// Arrival time at the final destination of the whole route.
export function estimatedArrival(departureTime: string, legs: RouteLeg[]): string | undefined {
  const arrivals = legArrivalTimes(departureTime, legs);
  return arrivals?.[arrivals.length - 1];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440; // wrap past midnight
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
