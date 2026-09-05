-- First real backend slice for JomKomute (see server/schema.sql for the
-- full design stub this adapts). Table is prefixed jomkomute_ per this
-- Supabase project's shared-project convention (master_db,
-- hmkjszolqnpcsoatrgcu, hosts multiple portfolio apps' tables).
--
-- File-only migration: written for review/history, not applied live by
-- this change. Apply it manually (Supabase SQL editor or `supabase db
-- push`) before the API routes in app/api/pings/* will work.

create extension if not exists pgcrypto;

create table if not exists jomkomute_planned_trip_pings (
  id           uuid primary key default gen_random_uuid(),

  -- hash(client_secret + route_id + date), computed client-side. Lets a
  -- device upsert or delete *that day's* ping (e.g. "Change plan" marking
  -- the day skipped) without the server ever seeing a stable identity it
  -- could correlate across different dates. See server/schema.sql.
  ping_key     text not null unique,

  station      text not null,       -- canonical station name (see lib/stations.ts)
  line_id      text,                -- optional, for a line-specific count
  trip_date    date not null,
  time_bucket  smallint not null,   -- minutes since midnight, rounded to nearest 15

  created_at   timestamptz not null default now()
);

create index if not exists jomkomute_planned_trip_pings_station_date_bucket
  on jomkomute_planned_trip_pings (station, trip_date, time_bucket);

-- Retention: a daily job should delete rows where trip_date < today (not
-- set up by this migration — see server/schema.sql's retention note).
-- e.g.: delete from jomkomute_planned_trip_pings where trip_date < current_date;

-- RLS: left disabled deliberately. There's no per-user auth in this
-- design (no accounts, only a client-generated ping_key — see
-- server/schema.sql's header), so access control is enforced in the API
-- route handlers (app/api/pings/*), which use the service-role key.
-- Anti-abuse layers 1 (per-IP rate limiting) and 3 (baseline plausibility
-- check) are followups, not implemented by this first slice — see the
-- route handlers' own comments.
