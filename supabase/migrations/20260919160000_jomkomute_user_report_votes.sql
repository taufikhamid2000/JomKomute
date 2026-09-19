-- Phase 2 of the reporting plan: lets riders mark an existing report as
-- "still happening" or "not anymore", so a report can be pulled from view
-- early on enough disputes rather than only ever expiring on the fixed
-- 24h window (see jomkomute_user_reports' own header). Also the missing
-- half of "can I trust this report" that Phase 1's clustering (count
-- badges, lib/report-clusters.ts) didn't address.
--
-- Applied automatically by .github/workflows/supabase-migrations.yml on
-- every push to main that touches this directory. Written idempotent
-- (create table/policy/view if not exists or drop+recreate) so
-- re-applying it is harmless, same convention as the base reports
-- migration.
--
-- Same "prototype, not hardened" caveats as jomkomute_user_reports: votes
-- are keyed by a client-generated, localStorage-persisted voter_key (see
-- lib/user-reports-client.ts), not a real per-user identity — there is no
-- server here to verify a voter_key actually belongs to whoever's
-- submitting it (static/no dedicated backend for this table, browser
-- writes straight to Supabase with the anon key). Treat votes as
-- self-reported and spoofable, same as the reports themselves.

create table if not exists jomkomute_user_report_votes (
  id          uuid primary key default gen_random_uuid(),

  report_id   uuid not null references jomkomute_user_reports (id) on delete cascade,
  voter_key   text not null,
  vote        text not null check (vote in ('confirm', 'dispute')),

  created_at  timestamptz not null default now(),

  unique (report_id, voter_key)
);

create index if not exists jomkomute_user_report_votes_report_id
  on jomkomute_user_report_votes (report_id);

alter table jomkomute_user_report_votes enable row level security;

-- Insert-or-update-own-vote: a voter_key can change its mind (confirm ->
-- dispute or back), which needs both insert (first vote) and update
-- (changing an existing one) granted — see lib/user-reports-client.ts's
-- upsert on (report_id, voter_key).
drop policy if exists jomkomute_user_report_votes_write on jomkomute_user_report_votes;
create policy jomkomute_user_report_votes_write
  on jomkomute_user_report_votes for insert
  to anon, authenticated
  with check (vote in ('confirm', 'dispute'));

drop policy if exists jomkomute_user_report_votes_update on jomkomute_user_report_votes;
create policy jomkomute_user_report_votes_update
  on jomkomute_user_report_votes for update
  to anon, authenticated
  using (true)
  with check (vote in ('confirm', 'dispute'));

drop policy if exists jomkomute_user_report_votes_select on jomkomute_user_report_votes;
create policy jomkomute_user_report_votes_select
  on jomkomute_user_report_votes for select
  to anon, authenticated
  using (true);

-- What app/report/page.tsx should actually query instead of the base
-- table directly: the same 24h-recency rule (inherited for free from
-- jomkomute_user_reports' own RLS select policy, which still applies to
-- rows read through this view) plus "not net-disputed away" — 3 or more
-- disputes than confirms hides a report early. The threshold is a plain
-- constant here rather than a config table; revisit if it needs to be
-- tunable without a migration.
create or replace view jomkomute_user_reports_visible as
select r.*
from jomkomute_user_reports r
left join (
  select
    report_id,
    count(*) filter (where vote = 'confirm') as confirms,
    count(*) filter (where vote = 'dispute') as disputes
  from jomkomute_user_report_votes
  group by report_id
) v on v.report_id = r.id
where coalesce(v.disputes, 0) - coalesce(v.confirms, 0) < 3;

grant select on jomkomute_user_reports_visible to anon, authenticated;
