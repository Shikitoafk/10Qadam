-- Personal plans: private, atomic usage limits. Safe to reapply without resetting usage.
begin;
create table if not exists public.ai_plan_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  attempts integer not null check (attempts between 1 and 3),
  primary key(user_id,usage_date)
);
alter table public.ai_plan_usage enable row level security;
revoke all on public.ai_plan_usage from public,anon,authenticated;

create or replace function public.consume_plan_quota()
returns boolean language plpgsql security definer set search_path = public,pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_day date := (clock_timestamp() at time zone 'UTC')::date;
  v_attempts integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  -- Project cap is serialized as well as the per-account limit, across function instances.
  perform pg_advisory_xact_lock(78123457);
  if (select coalesce(sum(attempts),0) from public.ai_plan_usage where usage_date=v_day)>=100 then
    return false;
  end if;
  insert into public.ai_plan_usage(user_id,usage_date,attempts) values(v_user,v_day,1)
    on conflict(user_id,usage_date) do update set attempts=ai_plan_usage.attempts+1
    where ai_plan_usage.attempts<3
    returning attempts into v_attempts;
  return v_attempts is not null;
end; $$;
revoke all on function public.consume_plan_quota() from public,anon;
grant execute on function public.consume_plan_quota() to authenticated;
commit;
