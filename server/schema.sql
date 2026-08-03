-- Design stub for a future "how many people are planning this trip"
-- backend — NOT deployed anywhere. The app itself is a static export
-- (see next.config.ts's `output: "export"`), so nothing here runs today;
-- this is the schema a real service would need if that feature is ever
-- built, kept in the repo so the design lives next to the idea it's for
-- (see app/dashboard/page.tsx and app/about/page.tsx's mock cards).
--
-- Deliberately excludes: user accounts, IP storage beyond ephemeral rate
-- limiting, and full saved routes — only the derived (station, date,
-- time) signal a count actually needs. See ping_key below for how a
-- client updates/deletes its own row without the server learning its
-- identity across days.

create table planned_trip_pings (
  id           uuid primary key default gen_random_uuid(),

  -- hash(client_secret + route_id + date), computed client-side. Lets a
  -- device upsert or delete *that day's* ping (e.g. when "Change plan"
  -- marks the day skipped) without the server ever seeing a stable
  -- identity it could correlate across different dates.
  ping_key     text not null unique,

  station      text not null,       -- canonical station name (see lib/stations.ts)
  line_id      text,                -- optional, for a line-specific count
  trip_date    date not null,
  time_bucket  smallint not null,   -- minutes since midnight, rounded to nearest 15

  created_at   timestamptz not null default now()
);

create index planned_trip_pings_station_date_bucket
  on planned_trip_pings (station, trip_date, time_bucket);

-- Retention: a daily job deletes rows where trip_date < today. The table
-- should never hold more than ~2 days of data — nothing to leak even if
-- the database were compromised, and no long-lived per-device history.
-- e.g.: delete from planned_trip_pings where trip_date < current_date;
