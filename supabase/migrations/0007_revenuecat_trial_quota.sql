-- Keep trial subscribers under the same three-import-per-day cap as free
-- access. Paid renewals remain unlimited Pro; trial timing comes from Apple
-- via the RevenueCat webhook rather than the device's first-launch clock.
alter table public.profiles
  add column if not exists is_trial boolean not null default false;

create or replace function public.apply_revenuecat_subscription_event(
  p_user_id uuid,
  p_is_pro boolean,
  p_expires_at timestamptz,
  p_is_trial boolean,
  p_event_timestamp_ms bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
     set is_pro = p_is_pro,
         pro_expires_at = p_expires_at,
         is_trial = p_is_pro and coalesce(p_is_trial, false),
         revenuecat_last_event_ms = p_event_timestamp_ms,
         updated_at = now()
   where id = p_user_id
     and (revenuecat_last_event_ms is null or revenuecat_last_event_ms <= p_event_timestamp_ms);

  return found;
end;
$$;

-- Keep the existing Render deployment working during a rolling deploy. The
-- new webhook uses the five-argument function; older instances default to
-- non-trial until they are replaced.
create or replace function public.apply_revenuecat_subscription_event(
  p_user_id uuid,
  p_is_pro boolean,
  p_expires_at timestamptz,
  p_event_timestamp_ms bigint
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.apply_revenuecat_subscription_event(
    p_user_id, p_is_pro, p_expires_at, false, p_event_timestamp_ms
  );
$$;

revoke all on function public.apply_revenuecat_subscription_event(uuid, boolean, timestamptz, boolean, bigint)
  from public, anon, authenticated;
grant execute on function public.apply_revenuecat_subscription_event(uuid, boolean, timestamptz, boolean, bigint)
  to service_role;
revoke all on function public.apply_revenuecat_subscription_event(uuid, boolean, timestamptz, bigint)
  from public, anon, authenticated;
grant execute on function public.apply_revenuecat_subscription_event(uuid, boolean, timestamptz, bigint)
  to service_role;

create or replace function public.daily_free_access_status(
  p_identity_key text,
  p_guest_key text default null,
  p_started_at timestamptz default null,
  p_consume boolean default false
)
returns table (
  allowed boolean,
  reason text,
  is_pro boolean,
  started_at timestamptz,
  expires_at timestamptz,
  day_key date,
  imports_today integer,
  imports_remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_day date := (now() at time zone 'UTC')::date;
  v_row public.daily_free_access%rowtype;
  v_identity_key text := p_identity_key;
  v_linked_user_key text;
  v_treat_as_guest boolean := p_identity_key like 'guest:%';
  v_pro boolean := false;
  v_trial boolean := false;
  v_trial_expires_at timestamptz;
  v_expires_at timestamptz;
  v_reason text;
  v_allowed boolean;
begin
  if p_identity_key !~ '^(user|guest):[0-9a-f-]{36}$'
     or (p_guest_key is not null and p_guest_key !~ '^guest:[0-9a-f-]{36}$') then
    raise exception 'Invalid free access identity';
  end if;

  if v_treat_as_guest then
    select l.user_key into v_linked_user_key
      from public.daily_free_access_guest_links l where l.guest_key = p_identity_key;
    if found then v_identity_key := v_linked_user_key; end if;
  end if;

  if p_identity_key like 'user:%' and p_guest_key is not null and p_guest_key <> p_identity_key then
    perform pg_advisory_xact_lock(hashtext(p_guest_key));
    if not exists (select 1 from public.daily_free_access_guest_links l where l.guest_key = p_guest_key) then
      select * into v_row from public.daily_free_access where identity_key = p_guest_key for update;
      if found then
        insert into public.daily_free_access(identity_key, started_at, usage_day, imports_today)
        values (p_identity_key, least(coalesce(p_started_at, v_row.started_at), v_row.started_at), v_day,
                case when v_row.usage_day = v_day then v_row.imports_today else 0 end)
        on conflict (identity_key) do update
          set started_at = least(public.daily_free_access.started_at, excluded.started_at),
              imports_today = case when public.daily_free_access.usage_day = v_day
                                   then public.daily_free_access.imports_today + excluded.imports_today
                                   else excluded.imports_today end,
              usage_day = v_day;
        insert into public.daily_free_access_guest_links(guest_key, user_key)
        values (p_guest_key, p_identity_key) on conflict (guest_key) do nothing;
        delete from public.daily_free_access where identity_key = p_guest_key;
      end if;
    end if;
  end if;

  insert into public.daily_free_access(identity_key, started_at, usage_day, imports_today)
  values (v_identity_key, least(coalesce(p_started_at, v_now), v_now), v_day, 0)
  on conflict (identity_key) do nothing;

  select * into v_row from public.daily_free_access where identity_key = v_identity_key for update;
  if v_row.usage_day <> v_day then
    update public.daily_free_access set usage_day = v_day, imports_today = 0
    where identity_key = v_identity_key returning * into v_row;
  end if;

  if not v_treat_as_guest and v_identity_key like 'user:%' then
    select
      coalesce(p.is_pro and not p.is_trial and (p.pro_expires_at is null or p.pro_expires_at > v_now), false),
      coalesce(p.is_pro and p.is_trial and p.pro_expires_at > v_now, false),
      p.pro_expires_at
    into v_pro, v_trial, v_trial_expires_at
    from public.profiles p
    where p.id = substring(v_identity_key from 6)::uuid;
    v_pro := coalesce(v_pro, false);
    v_trial := coalesce(v_trial, false);
  end if;

  v_expires_at := case when v_trial then v_trial_expires_at else v_row.started_at + interval '3 days' end;
  if v_pro then
    v_allowed := true;
    v_reason := 'PRO';
  elsif v_now >= v_expires_at then
    v_allowed := false;
    v_reason := 'FREE_PERIOD_EXPIRED';
  elsif v_row.imports_today >= 3 then
    v_allowed := false;
    v_reason := 'DAILY_LIMIT';
  else
    v_allowed := true;
    v_reason := 'OK';
  end if;

  if p_consume and v_allowed and not v_pro then
    update public.daily_free_access set imports_today = imports_today + 1
    where identity_key = v_identity_key returning * into v_row;
  end if;

  return query select v_allowed, v_reason, v_pro, v_row.started_at,
    v_expires_at, v_row.usage_day,
    v_row.imports_today::integer, greatest(0, 3 - v_row.imports_today)::integer;
end;
$$;

revoke all on function public.daily_free_access_status(text, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.daily_free_access_status(text, text, timestamptz, boolean)
  to service_role;
