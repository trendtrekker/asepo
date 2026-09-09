-- Shared, server-only cache for public recipe sources and reusable AI output.
-- RLS is enabled with no client policies: only the backend service-role client
-- can read or write cached material.

create table public.recipe_cache (
  cache_key text primary key,
  kind text not null check (kind in ('url', 'idea', 'suggestion', 'image')),
  normalized_input text not null,
  payload jsonb not null,
  prompt_version integer not null,
  hit_count bigint not null default 0,
  last_hit_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipe_cache_expiry_idx on public.recipe_cache (expires_at);
create index recipe_cache_kind_hits_idx on public.recipe_cache (kind, hit_count desc);

alter table public.recipe_cache enable row level security;
