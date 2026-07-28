-- plan_entries.day was never a real date — just a 0-6 offset into "whatever
-- week you last looked at", meaningless once you leave that week. Replace it
-- with a real date. Existing rows are backfilled onto the *current* real
-- week (Monday-based, matching the app's WEEK_DAYS order) rather than
-- dropped, so nothing already planned silently vanishes.
alter table public.plan_entries
  add column entry_date date not null default (
    current_date - ((extract(dow from current_date)::int + 6) % 7)
  );

update public.plan_entries
set entry_date = (current_date - ((extract(dow from current_date)::int + 6) % 7)) + day;

alter table public.plan_entries
  alter column entry_date drop default;

alter table public.plan_entries
  drop column day;
