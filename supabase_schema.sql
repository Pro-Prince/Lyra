-- ============================================================
-- UNIFIED IDEMPOTENT SCHEMA
-- ============================================================

-- 1. TABLES
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  preferred_name text,
  conversational_vibe text,
  topics text[] default '{}',
  active_outfit text default 'lyra',
  voice_preset_id text default 'soft-calm',
  onboarding_completed boolean default false,
  updated_at timestamptz default now()
);

-- Safely drop created_at if it exists from a previous run
alter table public.profiles drop column if exists created_at;

alter table public.profiles enable row level security;

create table if not exists public.memories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now()
);

alter table public.memories enable row level security;

-- 2. POLICIES
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can view their own memories" on public.memories;
create policy "Users can view their own memories"
  on public.memories for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own memories" on public.memories;
create policy "Users can insert their own memories"
  on public.memories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own memories" on public.memories;
create policy "Users can delete their own memories"
  on public.memories for delete
  using (auth.uid() = user_id);

-- 3. FUNCTIONS & TRIGGERS
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
