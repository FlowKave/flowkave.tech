-- FlowKave SaaS test schema for Supabase
-- Run this once in Supabase SQL Editor for app.flowkave.tech testing.

create extension if not exists "pgcrypto";

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_code text not null,
  status text not null check (status in ('trial', 'active', 'past_due', 'cancelled')) default 'trial',
  coupon_code text,
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  amount_toman integer not null default 0 check (amount_toman >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  local_device_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.restaurants enable row level security;
alter table public.subscriptions enable row level security;
alter table public.sync_events enable row level security;

-- Supabase still requires table privileges in addition to RLS policies.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.tenants to authenticated;
grant select, insert, update on public.tenant_members to authenticated;
grant select, insert, update on public.restaurants to authenticated;
grant select, insert, update on public.subscriptions to authenticated;
grant select, insert, update on public.sync_events to authenticated;

create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
  );
$$;

drop policy if exists "Users can create their own tenant" on public.tenants;
create policy "Users can create their own tenant"
on public.tenants for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Members can read their tenants" on public.tenants;
create policy "Members can read their tenants"
on public.tenants for select
to authenticated
using (owner_id = auth.uid() or public.is_tenant_member(id));

drop policy if exists "Owners can update their tenants" on public.tenants;
create policy "Owners can update their tenants"
on public.tenants for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can add themselves to a tenant" on public.tenant_members;
create policy "Users can add themselves to a tenant"
on public.tenant_members for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Members can read tenant memberships" on public.tenant_members;
create policy "Members can read tenant memberships"
on public.tenant_members for select
to authenticated
using (user_id = auth.uid() or public.is_tenant_member(tenant_id));

drop policy if exists "Members can create restaurants" on public.restaurants;
create policy "Members can create restaurants"
on public.restaurants for insert
to authenticated
with check (public.is_tenant_member(tenant_id));

drop policy if exists "Members can read restaurants" on public.restaurants;
create policy "Members can read restaurants"
on public.restaurants for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "Members can update restaurants" on public.restaurants;
create policy "Members can update restaurants"
on public.restaurants for update
to authenticated
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

drop policy if exists "Members can create subscriptions" on public.subscriptions;
create policy "Members can create subscriptions"
on public.subscriptions for insert
to authenticated
with check (public.is_tenant_member(tenant_id));

drop policy if exists "Members can read subscriptions" on public.subscriptions;
create policy "Members can read subscriptions"
on public.subscriptions for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "Members can create sync events" on public.sync_events;
create policy "Members can create sync events"
on public.sync_events for insert
to authenticated
with check (public.is_tenant_member(tenant_id));

drop policy if exists "Members can read sync events" on public.sync_events;
create policy "Members can read sync events"
on public.sync_events for select
to authenticated
using (public.is_tenant_member(tenant_id));
