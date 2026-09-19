-- Subscription access must be written by the trusted RevenueCat webhook or
-- server admin only. Client sync may still update the rest of a profile.
alter table public.profiles
  add column pro_expires_at timestamptz,
  add column revenuecat_last_event_ms bigint;

comment on column public.profiles.pro_expires_at is
  'Latest RevenueCat entitlement expiration; null is reserved for non-expiring/admin grants.';
comment on column public.profiles.revenuecat_last_event_ms is
  'Newest RevenueCat event timestamp applied, used to ignore out-of-order webhook retries.';

revoke update on table public.profiles from authenticated;
grant update (name, diet, people_count, allergies, custom_allergies, goals, imports_used, updated_at)
  on table public.profiles to authenticated;

revoke insert on table public.profiles from authenticated;
grant insert (id, name, diet, people_count, allergies, custom_allergies, goals, imports_used, updated_at)
  on table public.profiles to authenticated;

create or replace function public.apply_revenuecat_subscription_event(
  p_user_id uuid,
  p_is_pro boolean,
  p_expires_at timestamptz,
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
         revenuecat_last_event_ms = p_event_timestamp_ms,
         updated_at = now()
   where id = p_user_id
     and (revenuecat_last_event_ms is null or revenuecat_last_event_ms <= p_event_timestamp_ms);

  return found;
end;
$$;

revoke all on function public.apply_revenuecat_subscription_event(uuid, boolean, timestamptz, bigint)
  from public, anon, authenticated;
grant execute on function public.apply_revenuecat_subscription_event(uuid, boolean, timestamptz, bigint)
  to service_role;
