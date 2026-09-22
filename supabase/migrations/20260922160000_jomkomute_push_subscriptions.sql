-- Web Push subscriptions for app/api/push/* (see server route handlers).
-- No per-user auth in this app (same as planned_trip_pings — see
-- 20260905120000_jomkomute_planned_trip_pings.sql's header), so there's
-- nothing meaningful an RLS policy could scope a row to. Access is
-- gated entirely by the route handlers using the service-role key
-- (lib/supabase-server.ts) — anon/authenticated get NOTHING here, not
-- even select: a subscription's endpoint+keys are enough to push
-- directly to that browser bypassing this app entirely, so exposing
-- this table to the anon key at all (even read-only) would let anyone
-- holding the public anon key enumerate every subscriber's push
-- credentials. Already applied live via Supabase MCP; this just tracks
-- the same change as a migration file.
create table if not exists jomkomute.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  line_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on jomkomute.push_subscriptions from anon, authenticated;

-- Last level (normal/reported) app/api/push/check's cron job has
-- already notified subscribers about, per line — lets it push only on
-- an actual transition instead of re-pushing every run while a line
-- stays reported.
create table if not exists jomkomute.line_status_notified (
  line_id text primary key,
  level text not null,
  updated_at timestamptz not null default now()
);

revoke all on jomkomute.line_status_notified from anon, authenticated;
