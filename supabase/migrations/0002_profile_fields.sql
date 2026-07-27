-- Adds the one Onboarding field with no home in profiles yet.
alter table public.profiles
  add column goals jsonb not null default '{}'::jsonb;
