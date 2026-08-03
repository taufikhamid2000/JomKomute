-- Design stub for a future ridership-baseline backend — NOT deployed,
-- see schema.sql's header for why (this app is a static export).
-- Structurally different from schema.sql/issues-schema.sql: this is
-- public government data (data.gov.my's ridership_od_rapidrail_daily),
-- not user- or post-derived, so there's no privacy tension and no
-- anti-abuse problem — anyone can already download this dataset.
--
-- Granularity honesty check, carried over from the earlier research
-- into this dataset: it's daily totals only, no time-of-day breakdown.
-- That means this table can power a "typically busier/quieter than
-- usual" comparison at day-of-week granularity, and only a loose
-- plausibility check for schema.sql's pings anti-abuse layer 3 — it
-- cannot validate a specific time-bucket's ping count against a real
-- historical time-bucket average, because no such data exists anywhere
-- officially. Don't let a future implementation imply more precision
-- than the source supports.

-- One row per station per day — boardings, not the full OD matrix: the
-- source dataset is (origin, destination, date, ridership) pairs, summed
-- here across all destinations for a given origin, since a ping
-- represents "boarding here", not "alighting here".
create table station_daily_ridership (
  station       text not null,       -- canonical station name (see lib/stations.ts)
  ridership_date date not null,
  boardings     integer not null,    -- summed across all destinations from this station that day
  source        text not null default 'data.gov.my:ridership_od_rapidrail_daily',
  ingested_at   timestamptz not null default now(),
  primary key (station, ridership_date)
);

-- Materialized, recomputed weekly over a trailing 8-week window — not a
-- fixed historical constant, so it drifts with real schedule/ridership
-- changes instead of calcifying against whenever ingestion started.
-- sample_weeks matters: a newly-opened station or short history should
-- read as low-confidence, not silently averaged from too little data.
create table station_ridership_baseline (
  station           text not null,
  day_of_week       smallint not null check (day_of_week between 0 and 6),
  mean_boardings    numeric not null,
  stddev_boardings  numeric not null,
  sample_weeks      smallint not null,
  computed_at       timestamptz not null default now(),
  primary key (station, day_of_week)
);

-- Retention: none needed, unlike planned_trip_pings/ingested_posts. This
-- is small (~249 stations x 365 days/year =~ 90k rows/year) and public;
-- there's nothing sensitive to minimize by purging it.

-- Usage:
--   1. "Typically busier/quieter than usual" — compare a given day's
--      station_daily_ridership.boardings against
--      station_ridership_baseline's mean/stddev for that day_of_week.
--      Day-of-week granularity only, per the honesty note above.
--   2. schema.sql's pings anti-abuse layer 3 — a loose plausibility
--      ceiling, not a precise match: flag a ping count for review if a
--      single 30-minute bucket exceeds some fraction (e.g. 40%) of the
--      station's typical full-day boardings. A sanity bound against
--      wildly implausible spikes, not a real time-bucket comparison.
