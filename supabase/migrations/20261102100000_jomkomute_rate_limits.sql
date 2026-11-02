-- Durable fixed-window rate limiter for the unauthenticated API routes
-- (lib/api-guard.ts). Idempotent. RLS on, no grants to anon/authenticated:
-- only the service-role key (route handlers) can call the RPC.

create table if not exists jomkomute.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

alter table jomkomute.rate_limits enable row level security;
revoke all on jomkomute.rate_limits from public, anon, authenticated;

create index if not exists rate_limits_window_start_idx
  on jomkomute.rate_limits (window_start);

create or replace function jomkomute.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, hits integer, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_start timestamptz;
  v_hits integer;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 200
     or p_limit is null or p_limit < 1
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit arguments';
  end if;

  v_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  insert into jomkomute.rate_limits as r (key, window_start, hits)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Opportunistic cleanup of long-expired windows.
  if random() < 0.01 then
    delete from jomkomute.rate_limits where window_start < v_now - interval '1 day';
  end if;

  return query select
    v_hits <= p_limit,
    v_hits,
    greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - v_now)))::integer);
end;
$$;

revoke all on function jomkomute.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function jomkomute.rate_limit_hit(text, integer, integer) to service_role;
grant usage on schema jomkomute to service_role;
grant select, insert, update, delete on jomkomute.rate_limits to service_role;
