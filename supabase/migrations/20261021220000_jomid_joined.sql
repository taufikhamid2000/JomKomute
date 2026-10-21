-- Tells Jom ID (public.jomid_my_apps(), owned by the JomID repo) whether the
-- signed-in user has used jomkomute. jomid_my_apps() discovers every zero-arg
-- boolean function named jomid_joined_<app> and calls it, so this is all an
-- app needs to show up there. Not callable by clients directly.
create or replace function jomkomute.jomid_joined_jomkomute()
returns boolean
language sql stable set search_path = ''
as $$
  select exists (select 1 from jomkomute.user_reports where user_id = auth.uid())
    or exists (select 1 from jomkomute.user_report_votes where user_id = auth.uid())
$$;
revoke all on function jomkomute.jomid_joined_jomkomute() from public, anon, authenticated;
