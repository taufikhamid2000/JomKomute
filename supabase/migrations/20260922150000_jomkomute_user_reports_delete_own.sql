-- Lets someone delete a report they just made (e.g. an accidental tap)
-- without any real auth/account system. owner_secret is a random value
-- generated client-side at submit time and never selected back out
-- through jomkomute.user_reports_visible (only the submitter's own
-- insert response ever sees it) — the delete_own_report() function below
-- is the only way to act on it, and it checks the secret matches before
-- deleting anything. Already applied live via Supabase MCP; this just
-- tracks the same change as a migration file.
alter table jomkomute.user_reports add column if not exists owner_secret text;

create or replace function jomkomute.delete_own_report(report_id uuid, secret text)
returns boolean
language plpgsql
security definer
set search_path = jomkomute
as $$
declare
  deleted_count integer;
begin
  delete from jomkomute.user_reports
  where id = report_id and owner_secret is not null and owner_secret = secret;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

grant execute on function jomkomute.delete_own_report(uuid, text) to anon, authenticated;
