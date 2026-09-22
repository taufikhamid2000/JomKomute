// Daily report-volume history per line, for app/line-status's history
// chart. Reads jomkomute.user_reports directly with the service-role
// key (see lib/supabase-server.ts) rather than the 24h-windowed
// user_reports_visible view or the base table's own RLS (which only
// lets the anon key see the last 24h) — a longer history needs to
// bypass both, and only ever returns aggregate daily counts, never
// individual report rows (no lat/lng, note, or id), so nothing more
// sensitive than "N reports that day" leaves this route.
//
// This is rider-perceived report volume, not Prasarana's own official
// disruption count — a different, unverified metric (anonymous,
// unmoderated reports), not a replacement for or a rebuttal of theirs.
import { NextRequest, NextResponse } from "next/server";
import { LINES } from "@/lib/lines";
import { supabaseServer } from "@/lib/supabase-server";

const MAX_DAYS = 180;
const DEFAULT_DAYS = 30;

function dateKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD, UTC — good enough for a daily bucket
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const days = daysParam !== null ? Math.min(MAX_DAYS, Math.max(1, Number(daysParam) || DEFAULT_DAYS)) : DEFAULT_DAYS;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("user_reports")
    .select("created_at, line_id")
    .gte("created_at", since.toISOString())
    .not("line_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Zero-filled per line so a day with no reports still gets a bar at
  // height 0 instead of a gap the chart would have to special-case.
  const dayKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    dayKeys.push(dateKey(d.toISOString()));
  }

  // Seeded with every known line up front (all-zero) so a line with no
  // reports at all in the window still comes back as a proper
  // zero-filled series, not a missing key the client has to special-case.
  const countsByLine = new Map<string, Map<string, number>>(LINES.map((line) => [line.id, new Map<string, number>()]));
  for (const row of (data ?? []) as { created_at: string; line_id: string }[]) {
    const byDay = countsByLine.get(row.line_id) ?? new Map<string, number>();
    const key = dateKey(row.created_at);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    countsByLine.set(row.line_id, byDay);
  }

  const lines: Record<string, { date: string; count: number }[]> = {};
  for (const [lineId, byDay] of countsByLine) {
    lines[lineId] = dayKeys.map((date) => ({ date, count: byDay.get(date) ?? 0 }));
  }

  return NextResponse.json({ days, since: dayKeys[0], lines });
}
