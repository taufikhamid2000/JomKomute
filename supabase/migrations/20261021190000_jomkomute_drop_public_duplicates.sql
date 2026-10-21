-- Drop the empty duplicates that replaying the pre-move migrations left in
-- `public` (the old workflow re-ran every file on every push; see
-- .github/workflows/supabase-migrations.yml). The app only uses the real
-- objects in the `jomkomute` schema (20260922120000 moved them there).
-- public.line_operating_hours is only a re-seeded copy of the same 10 rows.
-- No CASCADE: if anything else depends on these, fail instead.

drop view if exists public.jomkomute_user_reports_visible;
drop table if exists public.jomkomute_user_report_votes;
drop table if exists public.jomkomute_user_reports;
drop table if exists public.jomkomute_planned_trip_pings;
drop table if exists public.line_operating_hours;
