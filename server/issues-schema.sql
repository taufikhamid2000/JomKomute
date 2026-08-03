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

  -- From the platform's own API at ingestion time — feeds the
  -- anti-abuse account-quality weighting below, not shown to users.
  author_account_created_at timestamptz,
  author_follower_count     integer,

  -- True if author_handle matches a known official RapidKL account.
  -- An official post overrides the crowd-sourced rule entirely — see
  -- the anti-abuse section's authoritative-override layer.
  is_official     boolean not null default false,

  matched_line_id text,               -- best-guess line from keyword match; null if ambiguous

  -- 'unclassified' until a (heuristic or human) pass runs. 'report' vs
  -- 'question' vs 'noise' is exactly the report-vs-uncertainty
  -- distinction above — deliberately not collapsed into one bucket.
  -- 'resolved_report' is the mirror case ("dah okay", "resumed") — see
  -- the auto-promotion/resolution rule below for why it's tracked
  -- separately from 'report' rather than inferred from absence of posts.
  classification  text not null default 'unclassified'
                    check (classification in ('unclassified', 'report', 'question', 'noise', 'resolved_report')),

  unique (source, external_id)
);

create index ingested_posts_line_posted_at on ingested_posts (matched_line_id, posted_at);

-- The thing app/issues/page.tsx actually renders — deliberately a
-- separate table from ingested_posts, not a flag on it. An incident is
-- either promoted manually from one or more posts, or auto-created per
-- the promotion/resolution rule below (application-level, not a DB
-- constraint — noted here for context, not enforced by this schema).
create table service_incidents (
  id           uuid primary key default gen_random_uuid(),
  line_id      text not null,
  headline     text not null,
  status       text not null default 'active' check (status in ('active', 'resolved')),
  started_at   timestamptz not null default now(),
  resolved_at  timestamptz,

  -- Separate from status: whether this incident has been corroborated
  -- beyond the raw crowd threshold. 'unverified' is the default for an
  -- auto-promoted incident — see the anti-abuse section's layer 5.
  -- Displayed differently by app/issues/page.tsx (e.g. "reported by
  -- commuters, unconfirmed") rather than shown with equal authority to
  -- a confirmed one.
  verification  text not null default 'unverified'
                  check (verification in ('unverified', 'confirmed', 'denied')),
  verified_via  text  -- 'official_post' | 'moderator', null while unverified
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

-- Incident promotion/resolution rule. Runs each time the scheduled
-- poller ingests a fresh batch, application-level (not enforced by this
-- schema, just designed here so it lives next to the tables it acts on).
--
-- PROMOTION (create a new service_incidents row):
--   - Only 'report'-classified posts count, never 'question'/'noise' —
--     the whole reason those are separate values (see the Maluri
--     "problem ke? ... tanya je" example: a question isn't a report).
--   - Dedup by author_handle, not by post: one author posting the same
--     complaint 3 times is 1 corroborating report, not 3 — independence
--     across distinct people is what the threshold is meant to measure.
--   - Threshold: >= 3 distinct authors' 'report' posts on the same
--     matched_line_id, within a rolling 30-minute window. Deliberately
--     conservative — a false alarm shown on every saved route for that
--     line is worse than being a few minutes slow to confirm a real one.
--   - Posts with an ambiguous matched_line_id (null — could plausibly
--     be more than one line) never count toward this threshold, only
--     toward evidence for an incident that already exists.
--   - Before creating, check for an already-active incident on that
--     line_id; if found, attach the new posts as incident_evidence to
--     it instead of opening a duplicate for the same ongoing event.
--
-- RESOLUTION (set status = 'resolved', resolved_at):
--   - Silence-based (default path): no new 'report' post on that line
--     for 45 minutes since the last one -> resolved, resolved_at = that
--     last post's posted_at + the cooldown.
--   - Explicit signal, lower bar: 1-2 corroborating 'resolved_report'
--     posts resolve immediately — confirming things are fine is
--     lower-stakes to get slightly early than raising a false alarm,
--     which is why this bar is lower than promotion's, not the same.
--   - Safety cap: force-resolve after 4 hours active regardless of
--     signal, so a stalled poller or a line that just goes quiet
--     without anyone posting confirmation doesn't leave an incident
--     stuck 'active' indefinitely.
--
-- Residual risk, stated plainly: 3 independent authors is still gameable
-- by someone running multiple accounts. This rule assumes organic
-- chatter, not a coordinated attempt to fabricate an incident — same
-- category of gap as the pings anti-abuse section in schema.sql, not
-- solved here either. The layers below narrow that gap; they don't
-- close it.

-- Anti-abuse (ingestion). Structurally different from schema.sql's
-- pings anti-abuse: there's no write API to gate here (see the header
-- above) — the attack surface is the public conversation itself.
-- Astroturfing enough chatter to trigger promotion is one failure mode;
-- flooding fake 'resolved_report' posts to suppress a REAL ongoing
-- incident is the mirror one, and arguably worse (hiding a genuine
-- problem beats a false alarm).
--
--   1. The >= 3 distinct-author threshold above isn't sufficient alone
--      — three burner accounts already clear it.
--
--   2. Near-duplicate text detection (application-level: trigram/
--      embedding similarity on the text column, not a schema
--      constraint). A copy-paste or lightly-reworded campaign
--      shouldn't count each near-identical post as independent
--      corroboration — require some minimum textual diversity among
--      the qualifying posts, not just distinct handles.
--
--   3. Timing-spread check, from posted_at: organic reports about a
--      real incident trickle in unevenly as people notice. Three posts
--      landing within the same few seconds is a bot-burst signature —
--      require the qualifying posts to spread across some minimum span
--      within the 30-minute promotion window, not all clustered at once.
--
--   4. Account-quality weighting, from author_account_created_at /
--      author_follower_count above: prefer authors with real history
--      over brand-new zero-history accounts when counting toward the
--      threshold. Doesn't stop a patient attacker willing to age
--      accounts in advance, but raises the cost above "spin up 3
--      burners today."
--
--   5. Promote as verification = 'unverified' by default (see
--      service_incidents above), not 'confirmed'. Fast to surface, but
--      displayed with less authority until a human glances at it or an
--      official post corroborates/denies it (layer 7).
--
--   6. Resolution-attack mitigation, the more dangerous failure mode:
--      'resolved_report' authors must be disjoint from the incident's
--      own 'report' authors — the same coordinated accounts can't both
--      raise and immediately quash it. An implausibly fast
--      'resolved_report' burst right after promotion is held back in
--      favor of the silence-based default resolution rather than
--      trusted at face value.
--
--   7. Authoritative override, from is_official above: an official
--      RapidKL post (or, once it exists, the promised 2026 GTFS-RT
--      service-alerts feed) confirms or denies an incident outright,
--      short-circuiting the crowd-based rule — it's the actual ground
--      truth once available; everything above is a stand-in until then.
--
-- None of this closes the gap for a patient, resourced astroturfing
-- campaign (aged accounts, varied phrasing, spread-out timing) — same
-- honesty as every other anti-abuse section in this repo: these layers
-- raise the cost of casual manipulation, they don't claim to eliminate it.
