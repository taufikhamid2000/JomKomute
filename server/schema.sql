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

-- Anti-abuse. No account system exists (see the header above), so
-- nothing here fully stops a determined, resourced attacker — that's
-- the fundamental tradeoff of staying account-free, not a gap unique to
-- this schema. What these layers do is make casual/single-actor
-- inflation or deflation of a count impractical:
--
--   1. Per-IP rate limiting on writes, enforced at the edge/gateway
--      (Cloudflare, API gateway middleware — not this database).
--      Counters live in short-TTL storage (a few hours), so this
--      doesn't reintroduce the persistent-identity problem ping_key was
--      designed to avoid. Generous enough for a household behind one
--      NAT (~20/day); blunts a single naive script, not a rotating-IP
--      attacker.
--
--   2. Suppression floor at read time (see openapi.yaml's GET
--      /pings/counts): counts below a minimum (e.g. 20) are never
--      returned, just "not enough data yet". This is application/query
--      logic, not a column here, but it changes the incentive — a
--      spammer has to cross a real threshold to move the number at
--      all, instead of nudging 3 to 4 unnoticed. Doubles as privacy
--      protection (never surfacing a small, near-identifiable group).
--
--   3. Baseline sanity check against real historical ridership — see
--      ridership-schema.sql's station_ridership_baseline table. Loose,
--      not precise: that dataset is daily totals only, no time-of-day
--      breakdown, so this is a plausibility ceiling (a bucket's count
--      shouldn't exceed some fraction of the station's typical full-day
--      total) rather than a real time-bucket comparison. A count that
--      fails even this loose check gets held for delayed publication
--      instead of shown instantly. Trades a little real-time-ness for
--      resistance to a sudden fake spike.
--
--   4. App attestation (Play Integrity / iOS DeviceCheck) would be the
--      strongest lever — proving a write came from a real installed
--      app, not a bare script — but it requires native app-store
--      distribution. Explicitly not adopted here: this project is a
--      static website (see the header above), and bringing in
--      attestation would mean committing to native packaging just to
--      support anti-abuse, a bigger scope change than this feature
--      justifies.
