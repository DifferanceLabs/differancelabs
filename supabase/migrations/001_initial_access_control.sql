create extension if not exists citext;
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_email citext not null references public.users(email) on delete cascade,
  name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by citext
);

create unique index if not exists access_requests_one_pending_per_user
  on public.access_requests (user_email)
  where status = 'pending';

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  url text,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive'))
);

create table if not exists public.app_grants (
  id uuid primary key default gen_random_uuid(),
  user_email citext not null references public.users(email) on delete cascade,
  app_slug text not null references public.apps(slug) on delete cascade,
  role text not null default 'member',
  granted_at timestamptz not null default now(),
  granted_by citext,
  unique (user_email, app_slug)
);

insert into public.apps (slug, name, status)
values
  ('admin', 'Admin', 'active'),
  ('adme', 'AdMe', 'active'),
  ('nomnomgo', 'NomNomGo', 'active'),
  ('pie', 'PIE', 'active'),
  ('divvi', 'Divvi', 'active'),
  ('prosperity-platform', 'Prosperity Platform', 'active'),
  ('crieve-hall-plumbing', 'Crieve Hall Plumbing', 'active')
on conflict (slug) do update
set name = excluded.name,
    status = excluded.status;

alter table public.users enable row level security;
alter table public.access_requests enable row level security;
alter table public.apps enable row level security;
alter table public.app_grants enable row level security;
