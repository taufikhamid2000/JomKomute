// Upserts a Web Push subscription — called by
// lib/push-notifications.ts's subscribeToPush() (new subscription) and
// syncPushLineIds() (existing subscription, followed lines changed).
// Same "no per-user auth, route handler is the access-control layer"
// design as app/api/pings/* — see lib/supabase-server.ts's header.
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isAllowedPushEndpoint, isKnownLineId, rateLimit, readJson } from "@/lib/api-guard";

const MAX_BODY_BYTES = 4096;
const MAX_LINE_IDS = 50;
const B64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;

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
    isAllowedPushEndpoint(b.endpoint) &&
    typeof b.p256dh === "string" &&
    b.p256dh.length > 0 &&
    b.p256dh.length <= 200 &&
    B64URL_RE.test(b.p256dh) &&
    typeof b.auth === "string" &&
    b.auth.length > 0 &&
    b.auth.length <= 64 &&
    B64URL_RE.test(b.auth) &&
    Array.isArray(b.lineIds) &&
    b.lineIds.length <= MAX_LINE_IDS &&
    b.lineIds.every(isKnownLineId)
  );
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "push-subscribe", 10);
  if (limited) return limited;
  const parsed = await readJson(request, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: "Body must include a push-service https endpoint, p256dh, auth, and lineIds (string array)" },
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
    console.error("[api/push/subscribe] database error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
