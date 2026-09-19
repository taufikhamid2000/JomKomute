-- Backs the "tap to report" prototype (app/report/page.tsx) — a
-- Waze-style map where anyone can drop a pin and flag an issue (delay,
-- accident, breakdown, crowded, other) and see other users' recent
-- reports. Table prefixed jomkomute_ per this Supabase project's
-- shared-project convention (master_db, hmkjszolqnpcsoatrgcu, hosts
-- multiple portfolio apps' tables — see the pings migration).
--
-- Applied automatically by .github/workflows/supabase-migrations.yml on
-- every push to main that touches this directory (`supabase db query
-- -f`, never `db push` — see that migration's header for why). Written
-- idempotent (create table/policy if not exists) so re-applying it is
-- harmless.
--
-- Unlike jomkomute_planned_trip_pings, this table IS written directly
-- from the browser with the public anon key (lib/user-reports-client.ts,
-- same convention as lib/supabase-client.ts) — there's no server here to
-- gate writes behind (static export, see next.config.ts's output:
-- "export"). RLS is therefore load-bearing, not optional: anon may
-- insert and select, nothing else. This is a prototype to visualize the
-- idea, not a hardened system — there's no per-device key, rate
-- limiting, or moderation here (unlike pings' ping_key or issues'
-- anti-abuse layers), so treat rows as fully public, anonymous, and
-- spoofable by design for now.

create extension if not exists pgcrypto;

create table if not exists jomkomute_user_reports (
  id          uuid primary key default gen_random_uuid(),

  lat         double precision not null,
  lng         double precision not null,
  category    text not null check (category in ('delay', 'accident', 'breakdown', 'crowded', 'other')),
  note        text,

  created_at  timestamptz not null default now()
);

create index if not exists jomkomute_user_reports_created_at
  on jomkomute_user_reports (created_at desc);

alter table jomkomute_user_reports enable row level security;

drop policy if exists jomkomute_user_reports_anon_insert on jomkomute_user_reports;
create policy jomkomute_user_reports_anon_insert
  on jomkomute_user_reports for insert
  to anon
  with check (
    category in ('delay', 'accident', 'breakdown', 'crowded', 'other')
    and lat between -90 and 90
    and lng between -180 and 180
    and coalesce(length(note), 0) <= 280
  );

drop policy if exists jomkomute_user_reports_anon_select on jomkomute_user_reports;
create policy jomkomute_user_reports_anon_select
  on jomkomute_user_reports for select
  to anon
  using (created_at > now() - interval '24 hours');

-- Retention: a daily job should delete rows older than the 24h window
-- above (not set up by this migration, same followup noted on the pings
-- table). e.g.:
--   delete from jomkomute_user_reports where created_at < now() - interval '24 hours';
