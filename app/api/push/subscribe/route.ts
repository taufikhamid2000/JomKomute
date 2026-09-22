// Upserts a Web Push subscription — called by
// lib/push-notifications.ts's subscribeToPush() (new subscription) and
// syncPushLineIds() (existing subscription, followed lines changed).
// Same "no per-user auth, route handler is the access-control layer"
// design as app/api/pings/* — see lib/supabase-server.ts's header.
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type SubscribeBody = {
  endpoint: string;
  p256dh: string;
  auth: string;
  lineIds: string[];
};

function isValidBody(body: unknown): body is SubscribeBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.endpoint === "string" &&
    b.endpoint.length > 0 &&
    typeof b.p256dh === "string" &&
    b.p256dh.length > 0 &&
    typeof b.auth === "string" &&
    b.auth.length > 0 &&
    Array.isArray(b.lineIds) &&
    b.lineIds.every((id) => typeof id === "string")
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: "Body must include endpoint, p256dh, auth, and lineIds (string array)" },
      { status: 400 },
    );
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      line_ids: body.lineIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
