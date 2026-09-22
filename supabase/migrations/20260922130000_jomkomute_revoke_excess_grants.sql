-- Found while verifying 20260922120000_jomkomute_move_reports_to_jomkomute_schema.sql's
-- grants actually landed as scoped: `anon` and `authenticated` already
-- held ALL privileges (select/insert/update/delete/truncate/references/
-- trigger) on every table in the jomkomute schema, including
-- jomkomute.planned_trip_pings — presumably from a blanket default-
-- privilege grant made when that schema was set up by hand.
--
-- For jomkomute.planned_trip_pings this is a real hole, not just excess:
-- its own migration (20260905120000_jomkomute_planned_trip_pings.sql)
-- deliberately disables RLS on it because access is supposed to be
-- gated entirely by the service-role key inside app/api/pings/*'s route
-- handlers — with RLS off, a straight table GRANT to anon is the only
-- thing standing between the public anon key (shipped in the browser
-- bundle, not a secret) and reading/writing/deleting all pings data
-- directly through PostgREST, bypassing those route handlers entirely.
-- Revoked outright: this table should have nothing granted to
-- anon/authenticated at all.
--
-- For the other four (which do have RLS enabled with no UPDATE/DELETE
-- policy defined), the excess UPDATE/DELETE/TRUNCATE grants were
-- harmless in practice — RLS blocks rows for any command with no
-- matching policy — but revoked anyway so the privilege layer actually
-- matches what each table's RLS policies intend, instead of relying on
-- RLS alone to hide a wider grant.

revoke all on jomkomute.planned_trip_pings from anon, authenticated;

revoke all on jomkomute.user_reports from anon, authenticated;
grant select, insert on jomkomute.user_reports to anon, authenticated;

revoke all on jomkomute.user_report_votes from anon, authenticated;
grant select, insert, update on jomkomute.user_report_votes to anon, authenticated;

revoke all on jomkomute.user_reports_visible from anon, authenticated;
grant select on jomkomute.user_reports_visible to anon, authenticated;

revoke all on jomkomute.line_operating_hours from anon, authenticated;
grant select on jomkomute.line_operating_hours to anon, authenticated;
