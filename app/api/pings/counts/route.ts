// Implements GET /pings/counts from server/openapi.yaml. Applies
// schema.sql's Anti-abuse layer 2 (suppression floor): counts below
// PUBLICATION_FLOOR come back as { count: null, suppressed: true }
// instead of a real number — both to blunt casual inflation/deflation
// and, per schema.sql, to avoid ever surfacing a small near-identifiable
// group.
//
// NOT implemented yet (see [pingKey]/route.ts's header for the same
// note): layer 3's baseline plausibility check, which would also set
// suppressed=true for an implausible spike pending review.
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isValidDate, isValidStation, rateLimit } from "@/lib/api-guard";

const PUBLICATION_FLOOR = 20;
const DEFAULT_WINDOW_MINUTES = 30;

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "pings-read", 120);
  if (limited) return limited;
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station");
  const date = searchParams.get("date");
  const bucketParam = searchParams.get("bucket");
  const windowParam = searchParams.get("window");

  if (!station || !date || bucketParam === null) {
    return NextResponse.json(
      { error: "station, date, and bucket query params are required" },
      { status: 400 },
    );
  }

  if (!isValidStation(station) || !isValidDate(date)) {
    return NextResponse.json({ error: "Invalid station or date" }, { status: 400 });
  }

  const bucket = Number(bucketParam);
  const window = windowParam !== null ? Number(windowParam) : DEFAULT_WINDOW_MINUTES;

  if (!Number.isFinite(bucket) || !Number.isFinite(window)) {
    return NextResponse.json({ error: "bucket and window must be numbers" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { count, error } = await supabase
    .from("planned_trip_pings")
    .select("*", { count: "exact", head: true })
    .eq("station", station)
    .eq("trip_date", date)
    .gte("time_bucket", bucket - window)
    .lte("time_bucket", bucket + window);

  if (error) {
    console.error("[api/pings/counts] database error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const total = count ?? 0;
  const suppressed = total < PUBLICATION_FLOOR;

  return NextResponse.json({
    count: suppressed ? null : total,
    suppressed,
  });
}
