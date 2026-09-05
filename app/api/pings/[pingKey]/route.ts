// Implements PUT/DELETE /pings/{pingKey} from server/openapi.yaml — the
// first real slice of the planned-trip-pings design (server/schema.sql).
//
// Deliberately NOT implemented yet (see schema.sql's Anti-abuse layers 1
// and 3, tracked as followups rather than blocking this first slice):
//   - layer 1, per-IP rate limiting at the edge/gateway
//   - layer 3, baseline plausibility check against station_ridership_baseline
// Layer 2 (the suppression floor) lives in the GET /pings/counts route,
// since it's a read-time behavior.
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type PingBody = {
  station: string;
  lineId?: string;
  tripDate: string; // YYYY-MM-DD
  timeBucket: number; // minutes since midnight
};

function isValidBody(body: unknown): body is PingBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.station === "string" &&
    b.station.length > 0 &&
    typeof b.tripDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(b.tripDate) &&
    typeof b.timeBucket === "number" &&
    Number.isFinite(b.timeBucket) &&
    b.timeBucket >= 0 &&
    b.timeBucket < 24 * 60 &&
    (b.lineId === undefined || typeof b.lineId === "string")
  );
}

// Round to the nearest 15 minutes, per schema.sql's time_bucket column —
// never trust the client's rounding, since GET /pings/counts's window
// math assumes bucket values already sit on that grid.
function roundToBucket(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ pingKey: string }> }) {
  const { pingKey } = await params;
  if (!pingKey) {
    return NextResponse.json({ error: "Missing pingKey" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: "Body must include station, tripDate (YYYY-MM-DD), and timeBucket (0-1439)" },
      { status: 400 },
    );
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("jomkomute_planned_trip_pings").upsert(
    {
      ping_key: pingKey,
      station: body.station,
      line_id: body.lineId ?? null,
      trip_date: body.tripDate,
      time_bucket: roundToBucket(body.timeBucket),
    },
    { onConflict: "ping_key" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ pingKey: string }> }) {
  const { pingKey } = await params;
  if (!pingKey) {
    return NextResponse.json({ error: "Missing pingKey" }, { status: 400 });
  }

  const supabase = supabaseServer();
  // No-op if it doesn't exist, per openapi.yaml — delete() doesn't error
  // on zero matched rows.
  const { error } = await supabase.from("jomkomute_planned_trip_pings").delete().eq("ping_key", pingKey);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
