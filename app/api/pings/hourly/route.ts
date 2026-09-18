// Implements GET /pings/hourly (server/openapi.yaml) — a per-hour
// aggregate of jomkomute_planned_trip_pings for one station/date, so
// lib/forecast.ts can replace its synthetic curve's hours with real
// data where enough of it exists. Same suppression floor as GET
// /pings/counts (schema.sql anti-abuse layer 2), applied per hour
// instead of to a single queried bucket.
//
// NOT implemented yet, same as the other pings routes: schema.sql's
// anti-abuse layers 1 (per-IP rate limiting) and 3 (baseline
// plausibility check).
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const PUBLICATION_FLOOR = 20;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station");
  const date = searchParams.get("date");

  if (!station || !date) {
    return NextResponse.json({ error: "station and date query params are required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("jomkomute_planned_trip_pings")
    .select("time_bucket")
    .eq("station", station)
    .eq("trip_date", date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const countsByHour = new Array(HOURS_PER_DAY).fill(0) as number[];
  for (const row of data ?? []) {
    const hour = Math.floor((row.time_bucket as number) / MINUTES_PER_HOUR);
    if (hour >= 0 && hour < HOURS_PER_DAY) countsByHour[hour] += 1;
  }

  const hours = countsByHour.map((count, hour) => ({
    hour,
    count: count < PUBLICATION_FLOOR ? null : count,
    suppressed: count < PUBLICATION_FLOOR,
  }));

  return NextResponse.json({ hours });
}
