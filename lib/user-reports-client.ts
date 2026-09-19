// Direct-to-Supabase client for app/report/page.tsx's "tap to report"
// prototype, following lib/supabase-client.ts's browser-client
// convention (anon key, safe from "use client" files). No API route to
// call through — this app is a static export (next.config.ts's output:
// "export"), so writes go straight from the browser to
// jomkomute_user_reports, gated by that table's own RLS policies (see
// supabase/migrations/20260919120000_jomkomute_user_reports.sql).

import { supabaseBrowser } from "@/lib/supabase-client";

export type ReportCategory = "delay" | "accident" | "breakdown" | "crowded" | "other";

export type UserReport = {
  id: string;
  lat: number;
  lng: number;
  category: ReportCategory;
  note: string | null;
  createdAt: string;
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
};

type UserReportRow = {
  id: string;
  lat: number;
  lng: number;
  category: ReportCategory;
  note: string | null;
  created_at: string;
};

function fromRow(row: UserReportRow): UserReport {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    category: row.category,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function submitUserReport(input: NewUserReport): Promise<UserReport> {
  // supabaseBrowser() is untyped (no generated Database type wired up
  // for this project yet, see lib/supabase-client.ts), so
  // insert/select fall back to `never` — cast the payload rather than
  // threading a Database type through just for this one table.
  const { data, error } = await supabaseBrowser()
    .from("jomkomute_user_reports")
    .insert({
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      note: input.note?.trim() ? input.note.trim().slice(0, 280) : null,
      reporter_lat: input.reporterLat ?? null,
      reporter_lng: input.reporterLng ?? null,
    } as never)
    .select()
    .single();

  if (error) throw new Error(`Failed to submit report: ${error.message}`);
  return fromRow(data as unknown as UserReportRow);
}

// Reads from jomkomute_user_reports_visible rather than the base table —
// that view (see supabase/migrations/20260919160000_jomkomute_user_report_votes.sql)
// already applies the base table's 24h-recency select policy and layers
// on "not net-disputed away by 3+ votes", so this is just fetching
// everything that's actually visible right now.
export async function getRecentUserReports(): Promise<UserReport[]> {
  const { data, error } = await supabaseBrowser()
    .from("jomkomute_user_reports_visible")
    .select()
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reports: ${error.message}`);
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
  const { error } = await supabaseBrowser()
    .from("jomkomute_user_report_votes")
    .upsert({ report_id: reportId, voter_key: voterKey, vote } as never, { onConflict: "report_id,voter_key" });

  if (error) throw new Error(`Failed to submit vote: ${error.message}`);

  if (typeof window !== "undefined") {
    const votes = getVotedReports();
    votes[reportId] = vote;
    window.localStorage.setItem(VOTED_REPORTS_STORAGE, JSON.stringify(votes));
  }
}
