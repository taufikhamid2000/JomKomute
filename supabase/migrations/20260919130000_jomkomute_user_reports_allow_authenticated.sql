-- Fixes a bug found while manually testing app/report/page.tsx: "Try the
-- demo" (components/demo-button.tsx) signs the browser in via
-- supabase.auth.signInAnonymously(), which issues a JWT with role
-- "authenticated" (and an is_anonymous claim) — not the raw "anon" role.
-- The original policies in 20260919120000_jomkomute_user_reports.sql only
-- granted to "anon", so every demo-mode insert/select was rejected with a
-- 403. Widening both policies to cover "authenticated" too (anon stays
-- included for any future non-authed access path). Written idempotent
-- (drop + recreate) like the original migration.

drop policy if exists jomkomute_user_reports_anon_insert on jomkomute_user_reports;
create policy jomkomute_user_reports_anon_insert
  on jomkomute_user_reports for insert
  to anon, authenticated
  with check (
    category in ('delay', 'accident', 'breakdown', 'crowded', 'other')
    and lat between -90 and 90
    and lng between -180 and 180
    and coalesce(length(note), 0) <= 280
  );

drop policy if exists jomkomute_user_reports_anon_select on jomkomute_user_reports;
create policy jomkomute_user_reports_anon_select
  on jomkomute_user_reports for select
  to anon, authenticated
  using (created_at > now() - interval '24 hours');
