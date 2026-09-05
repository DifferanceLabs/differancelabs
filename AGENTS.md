# Differance Labs Agent Instructions

This repository powers differancelabs.com.

This AGENTS.md file is authoritative project context. Before making significant changes, read this file and follow it.

Canonical local checkout:

```text
C:\Users\BDM\Documents\GitHub\differancelabs
```

## Codex Operating Rules

### Deployment

Production deployment flow is:

GitHub Main Branch
-> Vercel Production
-> differancelabs.com

Changes should be committed and pushed to GitHub. Vercel automatically deploys from `main`.

Do not manually upload production files.

Known production repository:

- GitHub: `DifferanceLabs/differancelabs`
- Vercel team: `differance-labs-projects`
- Vercel project: `differancelabs`

### Infrastructure Ownership

Codex may:

- Read repository contents.
- Modify application code.
- Commit and push code changes.
- Trigger or verify Vercel deployments.
- Read non-secret environment variable names.
- Add documentation.

Codex must not:

- Print secrets.
- Reveal environment variable values.
- Reveal OAuth credentials.
- Reveal API keys.
- Rotate credentials without explicit instruction.
- Change Cloudflare DNS without explicit instruction.
- Change Google OAuth configuration without explicit instruction.
- Modify domain ownership settings.
- Delete production data.

### Authentication Philosophy

Authentication and authorization are separate concerns.

Any Google user may authenticate.

Authentication does not imply access.

Application visibility is determined by grants.

Users without grants should see an empty-state experience and be able to request access.

### Access Model

Differance Labs acts as an access portal.

Users may:

- Authenticate.
- Request access.

Administrators may:

- Approve requests.
- Deny requests.
- Grant app access.
- Remove app access.

### Alpha App Launch Flow

During alpha, subdomain apps should not be linked directly from the launcher.

- `/api/session` may return app metadata needed to render launcher cards, but it must not expose subdomain app URLs.
- Launcher cards for subdomain apps should use `/api/apps/launch?app=<slug>`.
- `api/apps/launch.js` must re-check the signed session cookie, the Supabase app grant, app existence, and `active` app status before redirecting.
- Launch tokens are server-generated, short-lived, and include only `app_slug`, `user_email`, `issued_at`, `expires_at`, and `nonce`.
- Launch tokens are signed with `DL_APP_LAUNCH_SECRET`. Never print this secret. If it is missing at launch time, respond with the env var name only: `DL_APP_LAUNCH_SECRET`.
- Deployed app launch targets should use `https://`; loopback `http://` targets are only for local development.

### Future Architecture

Public:

- differancelabs.com

Private:

- admin.differancelabs.com

Applications:

- adme.differancelabs.com
- nomnomgo.differancelabs.com
- pie.differancelabs.com
- divvi.differancelabs.com

Applications should be designed so they can later move to independent domains without depending on Differance Labs infrastructure.

### Persistence

Do not use local file writes for durable storage.

Use Supabase for durable application data.

Configured Supabase production environment variable names:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Do not print their values.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

Use `SUPABASE_SERVICE_ROLE_KEY` only in server-side code or serverless functions.

### Database Changes

Do not directly modify production database structures.

When schema changes are required:

1. Create a migration file.
2. Explain the change.
3. Wait for approval before applying.

Prefer migrations over ad hoc SQL.

Keep migrations under:

```text
supabase/migrations
```

Database schema changes must be captured as migration files.

Do not directly alter production schema without explicit approval.

Prefer additive migrations.

Never print Supabase secrets.

### Design Direction

Dark.
Minimal.
Premium.
Quiet.
Private lab aesthetic.

Prefer:

- research institute
- skunkworks
- workshop
- incubator

Avoid:

- startup hype
- marketing language
- consulting aesthetic
- AI buzzword design

## Hosting And Domains

Cloudflare manages DNS for differancelabs.com.

Vercel hosts the site.

Do not change Cloudflare DNS unless explicitly asked.

Current domains:

- differancelabs.com
- www.differancelabs.com
- differancelabs.vercel.app

## Safe Update Process

Before making changes:

1. Inspect the repository.
2. Explain the intended change.
3. Edit the minimum files required.
4. Commit and push to GitHub.
5. Confirm Vercel auto-deployed successfully.

Do not create a separate local git repository.

## Site Intent

The public homepage should remain minimal, quiet, and generic.

Do not add navigation, project links, public contact forms, or references to AdMe, NomNomGo, PIE, Divvi, or other projects unless explicitly asked.

## Vercel CLI Access

Use the Vercel CLI only for authentication, project inspection, environment variables, and deployment-status troubleshooting. Do not use it to bypass the GitHub-to-Vercel production flow unless explicitly asked.

On Windows PowerShell, prefer `npx.cmd` because script execution policy can block `npx.ps1`.

If the CLI is not authenticated:

```powershell
npx.cmd vercel login
```

The command prints a Vercel device-auth URL and code. Ask the user to complete that browser authorization, then verify:

```powershell
npx.cmd vercel whoami
```

Known observed Vercel account:

- `jmzelnik`

If the checkout is not linked:

```powershell
npx.cmd vercel project ls
npx.cmd vercel link --yes --project differancelabs
```

The link command may create local `.vercel` metadata. Keep `.vercel/` ignored and do not commit it.

To inspect Vercel environment variable names:

```powershell
npx.cmd vercel env ls
```

To add a production environment variable:

```powershell
npx.cmd vercel env add NAME production
```

Required production auth variable names:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://differancelabs.com/api/auth/callback
SESSION_SECRET
DL_APP_LAUNCH_SECRET
ALLOWED_ADMIN_EMAIL
PUBLIC_SITE_URL=https://differancelabs.com
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

App grants, known users, and access requests are stored in Supabase. Do not use environment variables as the durable grants store.

Generate `SESSION_SECRET` locally when needed:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Do not print generated secrets in the final response.

After changing Vercel env vars, trigger a fresh production deployment through the normal GitHub flow. If there are no code changes, use an empty commit and push:

```powershell
git commit --allow-empty -m "Redeploy production"
git push origin main
```

## Google Authentication Guardrail

Do not modify the Google authentication flow.

You may restyle the container around the login button, spacing, typography, borders, shadows, and layout.

Do not change:

- href
- onclick
- form action
- OAuth routes
- auth handlers
- Google button component implementation

If styling is desired, wrap the existing button rather than replacing it.

## Repository Governance

Before making significant changes:

- Read AGENTS.md.
- Follow deployment instructions.
- Preserve the site's minimalist intent unless explicitly instructed otherwise.
- Keep architecture decisions documented here as the project evolves.

## Isolated Art Class Check-In

The new PWA is under `projects/art-class-checkin/`, with its own package,
lockfile, tests, Vercel settings and app-relative `supabase/migrations`.
Its separate Vercel project must use that folder as Root Directory. Never relink
the main project's local Vercel configuration to it. Root `.vercelignore`
excludes isolated app source, migration files and internal documentation from
the main static deployment.

Art Class Check-In requires an explicit `art-class-checkin` app grant even for
the portal administrator. App-local staff/admin roles do not grant portal
administration. Its launch token uses the documented five claims and a fragment
transport removed immediately by the receiving shell; other apps retain their
existing transport. Google OAuth handlers are unchanged.

Live records are proposed in the existing Supabase project's private
`art_checkin` schema and private `art-checkin-photos` bucket, sharing current
portal access records and project capacity. Preview must use a separate
fictional-data database and credentials. Existing production migration
approval requirements above apply to both the root launcher migration and
the app-relative migrations. No approval, DNS change or production deployment
is implied by this architecture note.
