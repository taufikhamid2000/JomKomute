-- Backs app/operating-hours/page.tsx and app/page.tsx's home-screen "last
-- train" hint (see lib/lines.ts for line ids/names/colors). One row per
-- line, holding weekday vs weekend first/last departure plus a plain-text
-- holiday note — derived from data.gov.my's GTFS static feeds via
-- scripts/generate-operating-hours.mjs (re-run that script and paste its
-- output here to refresh the seed).
--
-- Feed shape note (see scripts/generate-operating-hours.mjs's header
-- comment for the full explanation): Prasarana's rapid-rail-kl feed's
-- real first/last spread lives in frequencies.txt (start_time/end_time
-- blocks), not in stop_times.txt (which only holds one representative
-- trip's relative stop-to-stop offsets) — the LRT/MRT/Monorail/BRT rows
-- below are derived from those frequency blocks. KTMB's feed has no
-- frequencies.txt and fully enumerates stop_times.txt instead, so its
-- first/last times come straight from the individual trips.
--
-- Idempotent (create table if not exists + drop/recreate policies), like
-- supabase/migrations/20260919120000_jomkomute_user_reports.sql. RLS
-- select policy grants `to anon, authenticated` (not just anon) per the
-- lesson in 20260919130000_jomkomute_user_reports_allow_authenticated.sql
-- — the "Try the demo" button signs in anonymously via
-- supabase.auth.signInAnonymously(), which issues a JWT with role
-- "authenticated", not "anon".

create table if not exists line_operating_hours (
  line_id text primary key,
  line_name text,
  weekday_first time,
  weekday_last time,
  weekend_first time,
  weekend_last time,
  holiday_note text,
  updated_at timestamptz default now()
);

alter table line_operating_hours enable row level security;

drop policy if exists line_operating_hours_select on line_operating_hours;
create policy line_operating_hours_select
  on line_operating_hours for select
  to anon, authenticated
  using (true);

-- Seed data, from a manual run of scripts/generate-operating-hours.mjs
-- against the live GTFS feeds on 2026-09-19.
insert into line_operating_hours (line_id, line_name, weekday_first, weekday_last, weekend_first, weekend_last, holiday_note)
values
  ('ampang', 'LRT Ampang Line', '06:00:00', '23:25:00', '06:00:00', '23:25:00', null),
  ('kelana-jaya', 'LRT Kelana Jaya Line', '06:00:00', '23:15:00', '06:00:00', '23:15:00', null),
  ('sri-petaling', 'MRT Sri Petaling Line', '06:00:00', '00:00:00', '06:00:00', '00:00:00', null),
  ('kajang', 'MRT Kajang Line', '06:00:00', '00:00:00', '06:00:00', '22:55:00', null),
  ('putrajaya', 'MRT Putrajaya Line', '06:00:00', '00:00:00', '06:00:00', '22:55:00', null),
  ('monorail', 'KL Monorail', '06:00:00', '23:30:00', '06:00:00', '23:30:00', null),
  ('brt-sunway', 'BRT Sunway Line', '06:00:00', '00:00:00', '06:00:00', '00:00:00', null),
  ('shah-alam', 'LRT Shah Alam Line', '06:00:00', '00:00:00', '06:00:00', '00:00:00', null),
  ('komuter-seremban', 'KTM Komuter Seremban Line', '05:10:00', '23:02:00', '06:25:00', '23:02:00', 'Holiday schedule differs from the regular weekday/weekend timetable — check the operator''s app or signage on public holidays.'),
  ('komuter-port-klang', 'KTM Komuter Port Klang Line', '05:15:00', '23:10:00', '05:40:00', '23:05:00', 'Holiday schedule differs from the regular weekday/weekend timetable — check the operator''s app or signage on public holidays.')
on conflict (line_id) do update set
  line_name = excluded.line_name,
  weekday_first = excluded.weekday_first,
  weekday_last = excluded.weekday_last,
  weekend_first = excluded.weekend_first,
  weekend_last = excluded.weekend_last,
  holiday_note = excluded.holiday_note,
  updated_at = now();
