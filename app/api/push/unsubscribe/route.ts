// Deletes a Web Push subscription — called by
// lib/push-notifications.ts's unsubscribeFromPush(). No-op on an
// endpoint that's already gone, per the same convention as
// app/api/pings/[pingKey]/route.ts's DELETE.
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isAllowedPushEndpoint, rateLimit, readJson } from "@/lib/api-guard";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "push-unsubscribe", 10);
  if (limited) return limited;
  const parsed = await readJson(request, 4096);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  const endpoint = (body as { endpoint?: unknown })?.endpoint;
  if (!isAllowedPushEndpoint(endpoint)) {
    return NextResponse.json({ error: "Body must include endpoint" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) {
    console.error("[api/push/unsubscribe] database error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
