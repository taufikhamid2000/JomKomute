-- Security hardening, phase 1 (idempotent; additive, safe before the app deploy).
--
-- 1. reporter_lat / reporter_lng (the reporter's own position, kept for
--    abuse checks) were readable by anyone through user_reports and the
--    user_reports_visible view. The client only ever writes them. Drop them
--    from the view and revoke SELECT on the columns; INSERT stays.
-- 2. Voting moves behind cast_vote(). Today clients upsert directly, and the
--    UPDATE policy is `using (true)`, so anyone could PATCH every vote row.
--    The follow-up migration (phase 2) removes the direct write grants once
--    the app calls this function.

-- 1. view without reporter location (same filter as before)
drop view if exists jomkomute.user_reports_visible;
create view jomkomute.user_reports_visible as
  select r.id, r.lat, r.lng, r.category, r.note, r.created_at, r.line_id
  from jomkomute.user_reports r
  left join (
    select report_id,
           count(*) filter (where vote = 'confirm') as confirms,
           count(*) filter (where vote = 'dispute') as disputes
    from jomkomute.user_report_votes
    group by report_id
  ) v on v.report_id = r.id
  where coalesce(v.disputes, 0) - coalesce(v.confirms, 0) < 3;

revoke all on jomkomute.user_reports_visible from anon, authenticated;
grant select on jomkomute.user_reports_visible to anon, authenticated;

revoke select (reporter_lat, reporter_lng) on jomkomute.user_reports from anon, authenticated;

-- 2. cast_vote: one vote per (report, voter_key), changeable, nothing else.
create or replace function jomkomute.cast_vote(p_report_id uuid, p_voter_key text, p_vote text)
returns void
language plpgsql
security definer
set search_path to 'jomkomute', 'pg_temp'
as $$
begin
  if p_vote not in ('confirm', 'dispute') then
    raise exception 'invalid vote';
  end if;
  if p_voter_key is null or length(p_voter_key) < 8 or length(p_voter_key) > 100 then
    raise exception 'invalid voter key';
  end if;
  if not exists (
    select 1 from jomkomute.user_reports
    where id = p_report_id and created_at > now() - interval '24 hours'
  ) then
    raise exception 'report not found';
  end if;

  insert into jomkomute.user_report_votes (report_id, voter_key, vote)
  values (p_report_id, p_voter_key, p_vote)
  on conflict (report_id, voter_key) do update set vote = excluded.vote;
end;
$$;

revoke execute on function jomkomute.cast_vote(uuid, text, text) from public;
grant execute on function jomkomute.cast_vote(uuid, text, text) to anon, authenticated;
