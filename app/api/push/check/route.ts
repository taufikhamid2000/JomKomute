// Triggered by vercel.json's cron config — currently once a day
// (10pm UTC / 6am MYT), because a Vercel Hobby-plan project's own
// vercel.json cron REJECTS THE ENTIRE DEPLOYMENT at build time if any
// schedule fires more than once a day (that actually happened here —
// see git history around the "Web Push" commit: every deploy silently
// failed for three commits until this was caught and fixed). Once a
// day means this can miss same-day transitions entirely, which mostly
// defeats the point of a near-real-time push — lib/line-status-alerts.ts's
// in-app fallback is doing the real work until either this project
// moves to Vercel Pro (lets vercel.json's own cron run every few
// minutes) or something OUTSIDE Vercel's own cron mechanism (an
// external scheduler like cron-job.org, GitHub Actions on a schedule,
// etc., calling this URL with the same Authorization header) triggers
// it more often — that path isn't limited by this plan restriction at
// all, since it's just an ordinary authenticated HTTP call, not
// vercel.json's cron feature.
//
// Diffs each line's current crowdsourced status (lib/line-status.ts —
// same "24h + vote-confirmed" visibility every other page reads, no
// separate timer) against jomkomute.line_status_notified's last-known
// level, and pushes only on an actual transition (normal->reported or
// reported->normal) to subscriptions that follow that line — not on
// every run while a line just stays reported, and not on every new
// report once it's already been announced.
//
// Auth: this route has no session/cookie to check (cron calls it with
// no browser attached), so it's gated by a shared secret instead —
// see .env.example's CRON_SECRET. Vercel's own cron invocations send
// it automatically, but the route also accepts a manual
// Authorization: Bearer <CRON_SECRET> call from any other caller
// (including the external-scheduler option above).
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { LINES } from "@/lib/lines";
import { lineStatusesByLine } from "@/lib/line-status";
import { supabaseServer } from "@/lib/supabase-server";
import type { ReportCategory, UserReport } from "@/lib/user-reports-client";

type NotifiedRow = { line_id: string; level: string };
type SubscriptionRow = { endpoint: string; p256dh: string; auth: string; line_ids: string[] };
type ReportRow = {
  id: string;
  lat: number;
  lng: number;
  category: ReportCategory;
  created_at: string;
  line_id: string | null;
};

// Plain-English only for now — the recipient's locale lives in their
// browser's localStorage (lib/use-dictionary.ts), which this server-side
// cron job has no way to read. Good enough for a first push MVP; a
// locale-aware version would need the subscribe payload to carry it.
const CATEGORY_LABELS: Record<ReportCategory, string> = {
  delay: "a delay",
  accident: "an accident",
  breakdown: "a breakdown",
  crowded: "crowding",
  other: "an issue",
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET isn't configured on this deployment" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: "Push isn't configured (missing VAPID env vars)" }, { status: 500 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const supabase = supabaseServer();

  const [{ data: reportRows, error: reportsError }, { data: notifiedRows, error: notifiedError }] = await Promise.all([
    supabase.from("user_reports_visible").select("id, lat, lng, category, created_at, line_id"),
    supabase.from("line_status_notified").select("line_id, level"),
  ]);

  if (reportsError) return NextResponse.json({ error: reportsError.message }, { status: 500 });
  if (notifiedError) return NextResponse.json({ error: notifiedError.message }, { status: 500 });

  const reports: UserReport[] = ((reportRows ?? []) as ReportRow[]).map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    category: r.category,
    note: null,
    createdAt: r.created_at,
    lineId: r.line_id,
  }));

  const statusByLine = lineStatusesByLine(reports);
  const previousLevel = new Map<string, string>(((notifiedRows ?? []) as NotifiedRow[]).map((r) => [r.line_id, r.level]));

  const transitions: { lineId: string; lineName: string; level: "normal" | "reported"; count: number; category: ReportCategory | null }[] = [];
  for (const line of LINES) {
    const status = statusByLine.get(line.id);
    const level = status?.level ?? "normal";
    const wasLevel = previousLevel.get(line.id) ?? "normal";
    if (level !== wasLevel) {
      transitions.push({ lineId: line.id, lineName: line.name, level, count: status?.count ?? 0, category: status?.worstCategory ?? null });
    }
  }

  // Record every line's current level regardless of whether it changed
  // — cheaper than only touching the ones that transitioned, and keeps
  // a line that's never been seen before from being treated as a fresh
  // transition on a later run just because its row didn't exist yet.
  if (LINES.length > 0) {
    await supabase.from("line_status_notified").upsert(
      LINES.map((line) => ({
        line_id: line.id,
        level: statusByLine.get(line.id)?.level ?? "normal",
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "line_id" },
    );
  }

  if (transitions.length === 0) {
    return NextResponse.json({ transitions: 0, pushed: 0 });
  }

  const { data: subscriptionRows, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, line_ids");
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 });

  let pushed = 0;
  const deadEndpoints = new Set<string>();

  for (const transition of transitions) {
    const title = transition.lineName;
    const body =
      transition.level === "reported"
        ? `${transition.count === 1 ? "1 report" : `${transition.count} reports`} of ${
            transition.category ? CATEGORY_LABELS[transition.category] : "an issue"
          } in the last 24h.`
        : "Back to normal service.";
    const payload = JSON.stringify({ title, body, lineId: transition.lineId, url: "/line-status" });

    const subscribers = ((subscriptionRows ?? []) as SubscriptionRow[]).filter((s) => s.line_ids.includes(transition.lineId));

    await Promise.all(
      subscribers.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          pushed += 1;
        } catch (err) {
          // 404/410 means the browser/OS has permanently invalidated
          // this subscription (uninstalled, permission revoked, etc.) —
          // clean it up rather than retrying it forever. Any other
          // error (a transient 5xx from the push service) is left
          // alone; it'll just retry on the next cron run.
          const statusCode = (err as { statusCode?: number } | null)?.statusCode;
          if (statusCode === 404 || statusCode === 410) deadEndpoints.add(sub.endpoint);
        }
      }),
    );
  }

  if (deadEndpoints.size > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", Array.from(deadEndpoints));
  }

  return NextResponse.json({ transitions: transitions.length, pushed, removedDeadSubscriptions: deadEndpoints.size });
}
