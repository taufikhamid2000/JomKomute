-- Fixes browser writes to jomkomute_user_reports (and reads from
-- jomkomute_user_report_votes / jomkomute_user_reports_visible /
-- line_operating_hours) 404'ing against PostgREST.
--
-- lib/supabase-client.ts and lib/supabase-server.ts both configure
-- `db: { schema: "jomkomute" }` — every query targets a Postgres schema
-- literally named `jomkomute`, matching the move
-- jomkomute_planned_trip_pings already made to jomkomute.planned_trip_pings
-- (see 20260905120000_jomkomute_planned_trip_pings.sql's header vs. its
-- live definition — that move happened by hand, outside any tracked
-- migration). These four objects were left behind in `public` when that
-- reorg happened, so the client asked PostgREST for
-- `jomkomute.jomkomute_user_reports`, which didn't exist — a bare 404
-- with an empty body (this table's insert never even reached its own
-- RLS check).
--
-- Moves them into the jomkomute schema and drops the now-redundant
-- jomkomute_ prefix, matching planned_trip_pings' own rename.
-- ALTER ... SET SCHEMA carries RLS policies, indexes, FKs and views'
-- dependencies over unchanged (views track dependencies by OID, not by
-- schema-qualified name, so jomkomute_user_reports_visible's definition
-- doesn't need touching). Written with IF EXISTS guards so re-running
-- this file specifically is harmless — but note the *earlier* create-
-- table migrations for these four objects are not safe to replay after
-- this one runs: their unqualified `create table if not exists ...`
-- targets `public` by default and will recreate an empty, unused
-- duplicate there on the next push that touches this directory. Same
-- already-accepted tradeoff as jomkomute_planned_trip_pings' own move —
-- harmless orphaned clutter, not fixed here to avoid rewriting migration
-- history.
--
-- Table/view-level GRANTs below are scoped to exactly these four
-- objects, not a blanket "all tables in schema jomkomute" — that schema
-- also holds planned_trip_pings, which deliberately has RLS disabled and
-- relies on nothing being granted to anon/authenticated at all (access
-- gated entirely by app/api/pings/*'s service-role key, per that table's
-- own migration comment). A schema-wide grant would silently undo that.

create schema if not exists jomkomute;
grant usage on schema jomkomute to anon, authenticated;

alter table if exists public.jomkomute_user_reports set schema jomkomute;
alter table if exists jomkomute.jomkomute_user_reports rename to user_reports;

alter table if exists public.jomkomute_user_report_votes set schema jomkomute;
alter table if exists jomkomute.jomkomute_user_report_votes rename to user_report_votes;

alter view if exists public.jomkomute_user_reports_visible set schema jomkomute;
alter view if exists jomkomute.jomkomute_user_reports_visible rename to user_reports_visible;

alter table if exists public.line_operating_hours set schema jomkomute;

-- Matches each object's own RLS policies (see the migrations that
-- created them) — select+insert for reports, select+insert+update for
-- votes (upsert on report_id+voter_key, never deletes), select-only for
-- the visible view and line_operating_hours.
grant select, insert on jomkomute.user_reports to anon, authenticated;
grant select, insert, update on jomkomute.user_report_votes to anon, authenticated;
grant select on jomkomute.user_reports_visible to anon, authenticated;
grant select on jomkomute.line_operating_hours to anon, authenticated;
