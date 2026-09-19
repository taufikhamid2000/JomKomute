-- Phase 3 of the reporting plan: scopes "tap to report"
-- (app/report/page.tsx) to the route a rider is actually on, reached via
-- the home screen's floating report button with that route's legs passed
-- along (see lib/route-corridor.ts). Records which line the tapped point
-- actually landed nearest to, so the home screen's "nearby reports on
-- this line" overlay (components/home-map.tsx) can eventually match on
-- line_id directly instead of only a generic lat/lng radius.
--
-- Nullable: reports made with no route context (direct navigation to
-- /report, or no active/home/one-time route selected) have nothing to
-- record here, same as the reporter_lat/reporter_lng columns' own
-- "not always available" nullability.
--
-- Applied automatically by .github/workflows/supabase-migrations.yml on
-- every push to main that touches this directory. Written idempotent
-- (add column if not exists) so re-applying it is harmless.

alter table jomkomute_user_reports
  add column if not exists line_id text;
