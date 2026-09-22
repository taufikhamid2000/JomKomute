// Direct-to-Supabase client for app/report/page.tsx's "tap to report"
// prototype, following lib/supabase-client.ts's browser-client
// convention (anon key, safe from "use client" files). No API route to
// call through — this app is a static export (next.config.ts's output:
// "export"), so writes go straight from the browser to
// jomkomute_user_reports, gated by that table's own RLS policies (see
// supabase/migrations/20260919120000_jomkomute_user_reports.sql).

import { supabaseBrowser } from "@/lib/supabase-client";

// Thrown by submitUserReport/submitReportVote instead of a bare Error so
// callers (components/report-modal.tsx) can show a message that actually
// says why it failed, rather than one generic "couldn't send" for every
// case — offline, an actual Postgres/RLS rejection, and "something else
// went wrong" all read very differently to a rider mid-commute.
export type ReportSubmitReason = "offline" | "server" | "unknown";

export class ReportSubmitError extends Error {
  reason: ReportSubmitReason;
  constructor(reason: ReportSubmitReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

// supabase-js's PostgrestError is a plain object (message/details/hint/code),
// not an actual `Error` instance — `error instanceof Error` is false for it,
// so a naive `String(error)` on it gives "[object Object]" instead of its
// actual message. Pull the real text out regardless of which shape it is.
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const parts = [obj.message, obj.details, obj.hint].filter((p): p is string => typeof p === "string" && p.length > 0);
    if (parts.length > 0) return parts.join(" — ");
    try {
      return JSON.stringify(error);
    } catch {
      // falls through to String(error) below
    }
  }
  return String(error);
}

// Classifies whatever supabase-js hands back (a PostgrestError in `error`,
// or a thrown network exception when the request never reached the
// server at all) into the three buckets above.
function classifySubmitError(error: unknown): ReportSubmitError {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return new ReportSubmitError("offline", "You're offline.");
  }
  const message = extractErrorMessage(error);
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return new ReportSubmitError("offline", message);
  }
  const code = (error as { code?: string } | null)?.code;
  if (code || /row-level security|permission denied|violates/i.test(message)) {
    return new ReportSubmitError("server", `${message}${code ? ` [${code}]` : ""}`);
  }
  // Doesn't match either known pattern — the UI shows a generic message
  // for this bucket (see report-modal.tsx/report-map.tsx), so log the
  // real error here or it's otherwise invisible to whoever hit it.
  console.error("Unclassified report submit error:", error);
  return new ReportSubmitError("unknown", message);
}

export type ReportCategory = "delay" | "accident" | "breakdown" | "crowded" | "other";

export type UserReport = {
  id: string;
  lat: number;
  lng: number;
  category: ReportCategory;
  note: string | null;
  createdAt: string;
  lineId: string | null;
};

export type NewUserReport = {
  lat: number;
  lng: number;
  category: ReportCategory;
  note?: string;
  // The reporter's own GPS position at submit time — captured for future
  // anti-abuse/corroboration work (see the reporter_lat/reporter_lng
  // migration), not read back or displayed anywhere yet. Optional only
  // because the type is shared with the insert payload's shape; the
  // report page itself always has a fix before it lets you submit.
  reporterLat?: number | null;
  reporterLng?: number | null;
  // Which line the tapped point landed nearest to, when the report was
  // made in a route-scoped context (see lib/route-corridor.ts and
  // supabase/migrations/20260919170000_jomkomute_user_reports_line_id.sql)
  // — null for a report made with no route context at all.
  lineId?: string | null;
};

type UserReportRow = {
  id: string;
  lat: number;
  lng: number;
  category: ReportCategory;
  note: string | null;
  created_at: string;
  line_id: string | null;
};

function fromRow(row: UserReportRow): UserReport {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    category: row.category,
    note: row.note,
    createdAt: row.created_at,
    lineId: row.line_id,
  };
}

export async function submitUserReport(input: NewUserReport): Promise<UserReport> {
  // supabaseBrowser() is untyped (no generated Database type wired up
  // for this project yet, see lib/supabase-client.ts), so
  // insert/select fall back to `never` — cast the payload rather than
  // threading a Database type through just for this one table.
  let data: unknown;
  let error: unknown;
  try {
    ({ data, error } = await supabaseBrowser()
      .from("user_reports")
      .insert({
        lat: input.lat,
        lng: input.lng,
        category: input.category,
        note: input.note?.trim() ? input.note.trim().slice(0, 280) : null,
        reporter_lat: input.reporterLat ?? null,
        reporter_lng: input.reporterLng ?? null,
        line_id: input.lineId ?? null,
      } as never)
      .select()
      .single());
  } catch (thrown) {
    // The request never got a response at all (offline, DNS failure,
    // CORS) — supabase-js throws rather than returning { error } here.
    throw classifySubmitError(thrown);
  }

  if (error) throw classifySubmitError(error);
  return fromRow(data as unknown as UserReportRow);
}

// Reads from user_reports_visible rather than the base table — that view
// (see supabase/migrations/20260919160000_jomkomute_user_report_votes.sql)
// already applies the base table's 24h-recency select policy and layers
// on "not net-disputed away by 3+ votes", so this is just fetching
// everything that's actually visible right now.
export async function getRecentUserReports(): Promise<UserReport[]> {
  let data: unknown;
  let error: unknown;
  try {
    ({ data, error } = await supabaseBrowser().from("user_reports_visible").select().order("created_at", { ascending: false }));
  } catch (thrown) {
    throw classifySubmitError(thrown);
  }

  if (error) throw classifySubmitError(error);
  return ((data ?? []) as unknown as UserReportRow[]).map(fromRow);
}

export type ReportVote = "confirm" | "dispute";

const VOTER_KEY_STORAGE = "jomkomute:report-voter-key";

// A per-device random id, generated once and persisted — the same "no
// real per-user identity, just enough to dedupe one device's vote per
// report" role lib/pings-client.ts's client secret plays for pings,
// simplified here since votes don't need pings' cross-day-unlinkability
// hashing (see that file's header for why pings does).
function getVoterKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(VOTER_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(VOTER_KEY_STORAGE, key);
  }
  return key;
}

const VOTED_REPORTS_STORAGE = "jomkomute:voted-reports";

function getVotedReports(): Record<string, ReportVote> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(VOTED_REPORTS_STORAGE) ?? "{}") as Record<string, ReportVote>;
  } catch {
    return {};
  }
}

// What this device voted on a report, if anything — purely a UI
// convenience (show "you said: still happening" instead of the vote
// buttons again), not authoritative; the server has no way to verify a
// voter_key belongs to whoever's asking, same caveat as the vote table
// itself.
export function getMyVoteFor(reportId: string): ReportVote | null {
  return getVotedReports()[reportId] ?? null;
}

// Upsert on (report_id, voter_key) so a device can change its mind
// (confirm -> dispute or back) rather than erroring on the unique
// constraint the second time it votes on the same report.
export async function submitReportVote(reportId: string, vote: ReportVote): Promise<void> {
  const voterKey = getVoterKey();
  let error: unknown;
  try {
    ({ error } = await supabaseBrowser()
      .from("user_report_votes")
      .upsert({ report_id: reportId, voter_key: voterKey, vote } as never, { onConflict: "report_id,voter_key" }));
  } catch (thrown) {
    throw classifySubmitError(thrown);
  }

  if (error) throw classifySubmitError(error);

  if (typeof window !== "undefined") {
    const votes = getVotedReports();
    votes[reportId] = vote;
    window.localStorage.setItem(VOTED_REPORTS_STORAGE, JSON.stringify(votes));
  }
}
