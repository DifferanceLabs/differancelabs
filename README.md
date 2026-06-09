# Differance Labs

Minimal public homepage for differancelabs.com with a Google-authenticated private launcher and Supabase-backed access control.

## Structure

- `index.html` is the public homepage.
- `login/index.html` is the Google login page at `/login`.
- `api/auth/google.js` starts Google OAuth.
- `api/auth/callback.js` completes Google OAuth, records the verified user in Supabase, and creates the session cookie.
- `api/apps-page.js` gates `/apps` before serving the launcher shell.
- `api/_apps.html` is the protected launcher shell served by `/api/apps-page`.
- `api/session.js` returns the signed-in user and app cards granted to that user.
- `api/request-access.js` creates or refreshes a pending Supabase access request.
- `api/admin-page.js` gates `/admin` and `/apps/admin` before serving the admin shell.
- `api/admin/dashboard.js` returns admin-only requests, users, apps, and grants.
- `api/admin/requests.js` approves or denies access requests.
- `api/admin/grants.js` grants or removes app access.
- `api/logout.js` clears the session cookie.
- `api/_auth.js`, `api/_admin.js`, and `api/_supabase.js` contain shared server-side auth, admin, and Supabase helpers.
- `styles.css` contains the public homepage styles.
- `portal.css` contains login, launcher, and admin styles.
- `assets/mark.svg` contains the Differance Labs mark and favicon.

## Environment Variables

Create these in Vercel project settings. For local `vercel dev`, put them in `.env.local`.

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
SESSION_SECRET
ALLOWED_ADMIN_EMAIL
PUBLIC_SITE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. It is only used by serverless functions.

Optional app URL variables:

```text
APP_URL_ADME
APP_URL_NOMNOMGO
APP_URL_PIE
APP_URL_DIVVI
APP_URL_PROSPERITY_PLATFORM
APP_URL_CRIEVE_HALL_PLUMBING
```

The Admin card resolves to `/admin` unless an app URL is stored in Supabase.

## Auth And Access

Authentication and authorization are separate concerns.

Any verified Google account may sign in. Users without grants see the empty launcher and can request access. Application visibility is determined by rows in `app_grants`.

`ALLOWED_ADMIN_EMAIL` is the only admin account. That account always sees:

```text
admin
adme
nomnomgo
pie
divvi
prosperity-platform
crieve-hall-plumbing
```

## Supabase Setup

Run the schema below in the Supabase SQL Editor. Keep RLS enabled; serverless functions use the service role key server-side.

```sql
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
```

## Request Access

Signed-in users with no grants can click the mark button in `/apps`. The request route creates a pending row in `access_requests` or refreshes the existing pending request for that email.

Admin notification is intentionally stubbed in code until the notification channel is selected.

## Admin

The admin dashboard is available at:

```text
/admin
/apps/admin
```

Only `ALLOWED_ADMIN_EMAIL` can load the page or call admin APIs.

To grant app access:

1. Sign in with the admin Google account.
2. Open `/admin`.
3. Select a known user or enter an email.
4. Select one or more apps.
5. Click `Grant Selected`.

Grant removal is available from `Current Grants`.

## Google OAuth Setup

In Google Cloud Console, create an OAuth 2.0 Web application client.

Authorized JavaScript origins:

```text
http://localhost:3000
https://differancelabs.com
```

Authorized redirect URIs:

```text
http://localhost:3000/api/auth/callback
https://differancelabs.com/api/auth/callback
```

For Vercel preview deployments, either add the preview callback URL in Google Cloud Console or set `GOOGLE_REDIRECT_URI` to the exact deployed callback URL for that environment.

## Local Development

Install dependencies:

```powershell
npm install
```

Create `.env.local`:

```text
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
SESSION_SECRET=generate-a-long-random-secret
ALLOWED_ADMIN_EMAIL=you@example.com
PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Run the Vercel local server:

```powershell
npm run dev
```

Then visit `http://localhost:3000`.

## Deployment

Production is deployed from GitHub to Vercel.

- GitHub repository: `DifferanceLabs/differancelabs`
- Production branch: `main`
- Hosting: Vercel
- DNS: Cloudflare
- Production domains: `differancelabs.com`, `www.differancelabs.com`, and `differancelabs.vercel.app`

Deployment flow:

1. Make the minimum required changes in this repository.
2. Commit the changes to `main`.
3. Push `main` to GitHub.
4. Vercel automatically deploys production from `main`.
5. Confirm the production site after Vercel finishes.

Do not manually upload files to Vercel. Do not create a separate local git repository. Do not change Cloudflare DNS unless explicitly asked.

### Vercel CLI

Use the Vercel CLI for project access and deployment-status troubleshooting. On Windows PowerShell, prefer `npx.cmd`.

Authenticate when needed:

```powershell
npx.cmd vercel login
npx.cmd vercel whoami
```

The production project is `differance-labs-projects/differancelabs`.

List environment variable names:

```powershell
npx.cmd vercel env ls
```

Generate `SESSION_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Do not print generated secrets in the final response.

After changing env vars, trigger a new production deployment through GitHub. If there are no code changes, push an empty commit:

```powershell
git commit --allow-empty -m "Redeploy production"
git push origin main
```
