create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'employee' check (role in ('employee', 'owner')),
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_entries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  report_date date not null,
  order_for_date date not null,
  leftover_qty numeric(12,2) not null default 0,
  order_qty numeric(12,2) not null default 0,
  note text,
  created_by uuid not null references auth.users (id) on delete cascade,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, report_date, order_for_date)
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_inventory_entries_updated_at on public.inventory_entries;
create trigger trg_inventory_entries_updated_at
before update on public.inventory_entries
for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.inventory_entries enable row level security;

create or replace function public.is_owner(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid and p.role = 'owner'
  );
$$;

-- Profiles policies
drop policy if exists "profiles_select_own_or_owner" on public.profiles;
create policy "profiles_select_own_or_owner"
on public.profiles
for select
using (auth.uid() = id or public.is_owner(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own_or_owner" on public.profiles;

-- Items policies
drop policy if exists "items_select_authenticated" on public.items;
create policy "items_select_authenticated"
on public.items
for select
using (auth.role() = 'authenticated');

drop policy if exists "items_write_authenticated" on public.items;
create policy "items_write_authenticated"
on public.items
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Inventory policies
drop policy if exists "inventory_select_authenticated" on public.inventory_entries;
create policy "inventory_select_authenticated"
on public.inventory_entries
for select
using (auth.role() = 'authenticated');

drop policy if exists "inventory_insert_authenticated" on public.inventory_entries;
create policy "inventory_insert_authenticated"
on public.inventory_entries
for insert
with check (auth.role() = 'authenticated' and auth.uid() = created_by);

drop policy if exists "inventory_update_authenticated" on public.inventory_entries;
create policy "inventory_update_authenticated"
on public.inventory_entries
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
