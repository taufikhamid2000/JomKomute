-- Records which Jom ID account (if any) filed a report or cast a vote, so
-- public.jomid_my_apps() (owned by JomID) can tell whether a user has used
-- JomKomute. Nullable: signed-out riders still report anonymously, and rows
-- from before this migration stay unattributed.
--
-- user_id is filled by its default (auth.uid()) and is never readable or
-- writable by clients: table-level grants are replaced with column-level
-- ones that leave it out, so a report can't be linked to an account through
-- PostgREST and a client can't claim someone else's id. The same column
-- grants also stop exposing user_reports.owner_secret, which the old
-- table-wide SELECT leaked (it's only needed inside the security definer
-- delete_own_report()).

alter table jomkomute.user_reports
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;
alter table jomkomute.user_report_votes
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;

create index if not exists user_reports_user_id_idx on jomkomute.user_reports (user_id) where user_id is not null;
create index if not exists user_report_votes_user_id_idx on jomkomute.user_report_votes (user_id) where user_id is not null;

revoke all on jomkomute.user_reports from anon, authenticated;
grant select (id, lat, lng, category, note, created_at, reporter_lat, reporter_lng, line_id)
  on jomkomute.user_reports to anon, authenticated;
grant insert (lat, lng, category, note, reporter_lat, reporter_lng, line_id, owner_secret)
  on jomkomute.user_reports to anon, authenticated;

revoke all on jomkomute.user_report_votes from anon, authenticated;
grant select (id, report_id, voter_key, vote, created_at) on jomkomute.user_report_votes to anon, authenticated;
grant insert (report_id, voter_key, vote) on jomkomute.user_report_votes to anon, authenticated;
grant update (report_id, voter_key, vote) on jomkomute.user_report_votes to anon, authenticated;
