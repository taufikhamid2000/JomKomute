-- Security hardening, phase 2: applied after the app that calls
-- jomkomute.cast_vote() is deployed (older clients upsert directly and
-- would start failing). Idempotent.
--
-- Clients can no longer insert/update vote rows or read voter_key; all
-- voting goes through cast_vote(). Reads of the vote rows are not needed by
-- the app (the visibility filter runs inside the view).

drop policy if exists jomkomute_user_report_votes_write on jomkomute.user_report_votes;
drop policy if exists jomkomute_user_report_votes_update on jomkomute.user_report_votes;
drop policy if exists jomkomute_user_report_votes_select on jomkomute.user_report_votes;

revoke all on jomkomute.user_report_votes from anon, authenticated;
