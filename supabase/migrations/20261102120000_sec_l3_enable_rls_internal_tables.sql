-- Security audit L3: enable RLS on server-only tables. They have no anon/authenticated
-- grants and are accessed only with the service-role key (lib/supabase-server.ts), which
-- bypasses RLS, so this is defence-in-depth with no behaviour change.
alter table jomkomute.line_status_notified enable row level security;
alter table jomkomute.push_subscriptions   enable row level security;
