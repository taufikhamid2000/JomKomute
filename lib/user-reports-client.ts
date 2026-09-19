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
    } as never)
    .select()
    .single();

  if (error) throw new Error(`Failed to submit report: ${error.message}`);
  return fromRow(data as unknown as UserReportRow);
}

// Last 24h of reports — matches the table's own anon select policy, so
// this is really just fetching everything that's visible.
export async function getRecentUserReports(): Promise<UserReport[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseBrowser()
    .from("jomkomute_user_reports")
    .select()
    .gt("created_at", since)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reports: ${error.message}`);
  return ((data ?? []) as unknown as UserReportRow[]).map(fromRow);
}
