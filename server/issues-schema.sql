-- Design stub for a future Issues-ingestion backend — NOT deployed, see
-- schema.sql's header for why (this app is a static export). Companion
-- to schema.sql/openapi.yaml (the planned-trip-pings design); this one
-- is for app/issues/page.tsx and lib/mock-issues.ts instead.
--
-- Key difference from pings: this data originates server-side (a
-- scheduled job polling RapidKL's own X/Threads posts, plus open
-- keyword search — see the "KJ line" Threads example from conversation)
-- rather than from the client. That means no public write endpoint is
-- needed at all (see issues-openapi.yaml) — a smaller attack surface
-- than pings, which has to accept client writes by design.
--
-- The Maluri/Threads example ("problem ke? ... tanya je") is why raw
-- posts and confirmed incidents are two separate tables: that post was
-- someone asking, not reporting — treating every keyword match as an
-- alert would manufacture incidents out of uncertainty.

create table ingested_posts (
  id              uuid primary key default gen_random_uuid(),

  source          text not null check (source in ('x', 'threads')),
  external_id     text not null,      -- the platform's own post id, for dedup on re-poll
  author_handle   text not null,
  posted_at       timestamptz not null,
  ingested_at     timestamptz not null default now(),
  text            text not null,

  matched_line_id text,               -- best-guess line from keyword match; null if ambiguous

  -- 'unclassified' until a (heuristic or human) pass runs. 'report' vs
  -- 'question' vs 'noise' is exactly the report-vs-uncertainty
  -- distinction above — deliberately not collapsed into one bucket.
  classification  text not null default 'unclassified'
                    check (classification in ('unclassified', 'report', 'question', 'noise')),

  unique (source, external_id)
);

create index ingested_posts_line_posted_at on ingested_posts (matched_line_id, posted_at);

-- The thing app/issues/page.tsx actually renders — deliberately a
-- separate table from ingested_posts, not a flag on it. An incident is
-- either promoted manually from one or more posts, or auto-created when
-- enough independent 'report' posts about the same line cluster within
-- a short window (an application-level rule, not a DB constraint —
-- doesn't belong in this schema, just noted here for context).
create table service_incidents (
  id           uuid primary key default gen_random_uuid(),
  line_id      text not null,
  headline     text not null,
  status       text not null default 'active' check (status in ('active', 'resolved')),
  started_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- Which posts back a given incident — what the Issues page's "seen on
-- X/Threads" quote comes from (see lib/mock-issues.ts's MockIssue.quote
-- for the shape this replaces).
create table incident_evidence (
  incident_id  uuid not null references service_incidents(id) on delete cascade,
  post_id      uuid not null references ingested_posts(id) on delete cascade,
  primary key (incident_id, post_id)
);

-- Retention, in two tiers since posts and incidents have different
-- lifecycles:
--   - 'noise'/'unclassified' posts: purge after 48h — never became
--     anything, no reason to keep them.
--   - 'report'/'question' posts not attached to any incident: purge
--     after 7 days.
--   - posts attached to an incident (via incident_evidence): kept for
--     the incident's own retention window (e.g. 30 days after
--     resolved_at), for audit/debugging, then cascade-deleted with it.
