-- jomkomute.user_reports_visible predates jomkomute.user_reports.line_id
-- (added later, see 20260919170000_jomkomute_user_reports_line_id.sql —
-- that migration only alters the base table, not this view) and never
-- picked the column up. Every report read through this view (which is
-- what lib/user-reports-client.ts's getRecentUserReports() actually
-- queries) therefore came back with lineId: null regardless of what was
-- stored on the row, so no line could ever show a "reported" status on
-- /operating-hours even with a correctly-tagged report in the base
-- table. Re-create the view with line_id included, same dispute-vote
-- filtering as before.

create or replace view jomkomute.user_reports_visible as
select
  r.id,
  r.lat,
  r.lng,
  r.category,
  r.note,
  r.created_at,
  r.reporter_lat,
  r.reporter_lng,
  r.line_id
from jomkomute.user_reports r
left join (
  select
    report_id,
    count(*) filter (where vote = 'confirm') as confirms,
    count(*) filter (where vote = 'dispute') as disputes
  from jomkomute.user_report_votes
  group by report_id
) v on v.report_id = r.id
where coalesce(v.disputes, 0) - coalesce(v.confirms, 0) < 3;
