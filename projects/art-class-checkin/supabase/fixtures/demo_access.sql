-- Only for an EMPTY demo/local database. Never run in the live portal database.
create extension if not exists citext with schema public;
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(), email public.citext not null unique,
  name text,avatar_url text,created_at timestamptz default now(),last_login_at timestamptz default now()
);
create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),slug text not null unique,name text not null,
  url text,description text,status text not null default 'active'
);
create table if not exists public.app_grants (
  id uuid primary key default gen_random_uuid(),user_email public.citext not null references public.users(email),
  app_slug text not null references public.apps(slug),role text not null default 'member',
  granted_at timestamptz default now(),granted_by public.citext,unique(user_email,app_slug)
);
alter table public.users enable row level security;
alter table public.apps enable row level security;
alter table public.app_grants enable row level security;
insert into public.users(email,name) values
 ('admin@art-demo.invalid','Demo Administrator'),('staff@art-demo.invalid','Demo Staff') on conflict do nothing;
insert into public.apps(slug,name,status) values('art-class-checkin','Art Class Check-In','active') on conflict do nothing;
insert into public.app_grants(user_email,app_slug,role) values
 ('admin@art-demo.invalid','art-class-checkin','admin'),('staff@art-demo.invalid','art-class-checkin','staff') on conflict do nothing;
