-- BAROS database schema for Supabase
-- Run this entire file once in Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text default 'Madrid',
  currency text not null default 'EUR',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  unit text not null default 'L',
  quantity numeric not null default 0,
  min_quantity numeric not null default 0,
  purchase_price numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  category text not null default 'Classic',
  cost numeric not null default 0,
  price numeric not null default 0,
  active boolean not null default true,
  image_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric not null default 0,
  unique(recipe_id, ingredient_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create index if not exists ingredients_venue_id_idx on public.ingredients(venue_id);
create index if not exists recipes_venue_id_idx on public.recipes(venue_id);
create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);

alter table public.venues enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.profiles enable row level security;

-- Users can only access their own venue and its data.
create or replace function public.owns_venue(target_venue uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.venues
    where id = target_venue and owner_id = auth.uid()
  );
$$;

create policy "owners manage own venues" on public.venues
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owners manage own ingredients" on public.ingredients
  for all using (public.owns_venue(venue_id)) with check (public.owns_venue(venue_id));

create policy "owners manage own recipes" on public.recipes
  for all using (public.owns_venue(venue_id)) with check (public.owns_venue(venue_id));

create policy "owners manage own recipe ingredients" on public.recipe_ingredients
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.owns_venue(r.venue_id)
    )
  ) with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.owns_venue(r.venue_id)
    )
  );

create policy "users manage own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
