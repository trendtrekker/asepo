-- Asepo — initial schema.
--
-- One row per table per user, protected by Row Level Security: every policy
-- below is "you can only touch rows where user_id = you". The anon key the
-- app ships with is safe specifically because these policies exist — it
-- can't read or write anyone else's data no matter what it's asked to do.
--
-- Ids stay as client-generated text (e.g. "r-ms17g4is", "cb-xxxx") rather
-- than switching to uuid, so the existing local AsyncStorage data can migrate
-- in unchanged on first sign-in instead of needing an id-remapping pass.

-- ------------------------------------------------------------------
-- profiles — one row per user, extends auth.users with app-specific fields.
-- ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  diet text not null default 'None',
  people_count int not null default 2,
  allergies jsonb not null default '{}'::jsonb,
  custom_allergies text[] not null default '{}',
  is_pro boolean not null default false,
  imports_used int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- A new auth.users row gets a matching profile automatically, so the app
-- never has to remember to create one after sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- cookbooks
-- ------------------------------------------------------------------
create table public.cookbooks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  color text,
  emoji text,
  created_at timestamptz not null default now()
);

alter table public.cookbooks enable row level security;

create policy "cookbooks: all own" on public.cookbooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index cookbooks_user_id_idx on public.cookbooks (user_id);

-- ------------------------------------------------------------------
-- recipes
-- ------------------------------------------------------------------
create table public.recipes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  minutes int not null default 0,
  calories numeric not null default 0,
  servings int not null default 2,
  favorite boolean not null default false,
  cuisine text not null default 'American',
  meal_type text not null default 'Dinner',
  difficulty text not null default 'Easy',
  diets text[] not null default '{}',
  tags text[] not null default '{}',
  -- Cookbook ids this recipe belongs to. Not a foreign key array on purpose —
  -- a recipe can reference a cookbook id after that cookbook's been deleted
  -- for a moment mid-sync, and that should never fail the whole write.
  cookbooks text[] not null default '{}',
  rating numeric not null default 0,
  cooked_count int not null default 0,
  added_at bigint not null,
  source jsonb,
  ingredients jsonb not null default '[]'::jsonb,
  instructions text[] not null default '{}',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "recipes: all own" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index recipes_user_id_idx on public.recipes (user_id);

-- ------------------------------------------------------------------
-- grocery_items
-- ------------------------------------------------------------------
create table public.grocery_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  qty text not null default '',
  unit text not null default '',
  checked boolean not null default false,
  -- Recipe titles that contributed this line — see groupByMeal() in the app,
  -- which needs this to show the same grocery item under every meal it's for.
  sources text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.grocery_items enable row level security;

create policy "grocery_items: all own" on public.grocery_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index grocery_items_user_id_idx on public.grocery_items (user_id);

-- ------------------------------------------------------------------
-- plan_entries — meal plan
-- ------------------------------------------------------------------
create table public.plan_entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day int not null,
  slot text not null,
  recipe_id text not null,
  servings int not null default 2,
  created_at timestamptz not null default now()
);

alter table public.plan_entries enable row level security;

create policy "plan_entries: all own" on public.plan_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index plan_entries_user_id_idx on public.plan_entries (user_id);

-- ------------------------------------------------------------------
-- storage — recipe photos
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

-- Photos are public to read (so <Image> can load them with a plain URL, the
-- same way the Express server's re-hosted images work today) but only the
-- owner can write into their own folder, enforced by the path's first
-- segment being their user id: "{user_id}/whatever.jpg".
create policy "recipe-photos: public read" on storage.objects
  for select using (bucket_id = 'recipe-photos');

create policy "recipe-photos: owner write" on storage.objects
  for insert with check (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recipe-photos: owner update" on storage.objects
  for update using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recipe-photos: owner delete" on storage.objects
  for delete using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
