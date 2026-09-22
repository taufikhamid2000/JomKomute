// Deletes a Web Push subscription — called by
// lib/push-notifications.ts's unsubscribeFromPush(). No-op on an
// endpoint that's already gone, per the same convention as
// app/api/pings/[pingKey]/route.ts's DELETE.
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const endpoint = (body as { endpoint?: unknown })?.endpoint;
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return NextResponse.json({ error: "Body must include endpoint" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
