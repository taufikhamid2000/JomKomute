-- Adds the reporter's own GPS position to jomkomute_user_reports
-- (app/report/page.tsx), captured alongside the tapped lat/lng once the
-- client started gating submission on navigator.geolocation (see that
-- page and lib/user-reports-client.ts). Purely for future anti-abuse /
-- corroboration work (e.g. flagging reports whose reporter was
-- implausibly far from the tapped spot) — nothing reads these columns
-- yet, this migration only makes room to start recording them.
--
-- Nullable: geolocation can fail (denied/unavailable) even after the
-- client-side distance check below is satisfied for older report rows
-- inserted before this column existed, and the reporter's own position
-- is not itself validated server-side (no server to do that from, see
-- the base migration's header) — treat it as self-reported, same
-- spoofability caveat as the rest of this table.
--
-- Applied automatically by .github/workflows/supabase-migrations.yml on
-- every push to main that touches this directory. Written idempotent
-- (add column if not exists) so re-applying it is harmless.

alter table jomkomute_user_reports
  add column if not exists reporter_lat double precision;

alter table jomkomute_user_reports
  add column if not exists reporter_lng double precision;
