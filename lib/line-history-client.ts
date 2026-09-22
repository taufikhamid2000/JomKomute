// Client for app/api/line-history — daily report-volume counts per
// line, over a longer window than the 24h user_reports_visible view
// exposes (see that route's header for why this needs a server route
// with the service-role key rather than a direct-to-Supabase read like
// the rest of lib/user-reports-client.ts).

export type LineHistoryDay = { date: string; count: number };

export type LineHistory = {
  days: number;
  since: string;
  lines: Record<string, LineHistoryDay[]>;
};

export async function getLineHistory(days: number): Promise<LineHistory> {
  const res = await fetch(`/api/line-history?days=${days}`);
  if (!res.ok) throw new Error(`Couldn't load report history (${res.status})`);
  return res.json() as Promise<LineHistory>;
}
