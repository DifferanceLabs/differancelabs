# Differance Labs Agent Instructions

## Project

This repository powers differancelabs.com.

## Hosting

Production is deployed on Vercel from the GitHub repository:
DifferanceLabs/differancelabs

## Deployment Flow

- Changes should be committed and pushed to the main branch on GitHub.
- Vercel automatically deploys production from main.
- Do not manually upload files to Vercel.
- Do not create a separate local git repository.
- Do not change Cloudflare DNS unless explicitly asked.
- Cloudflare manages DNS for differancelabs.com.
- Vercel hosts the site.

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

The known Vercel account/team/project are:

- Account observed: `jmzelnik`
- Team: `differance-labs-projects`
- Project: `differancelabs`

If the checkout is not linked:

```powershell
npx.cmd vercel project ls
npx.cmd vercel link --yes --project differancelabs
```

The link command may create local `.vercel` metadata. Keep `.vercel/` ignored and do not commit it.

To inspect Vercel environment variables:

```powershell
npx.cmd vercel env ls
```

To add a production environment variable:

```powershell
npx.cmd vercel env add NAME production
```

Required production auth variables:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://differancelabs.com/api/auth/callback
SESSION_SECRET
ALLOWED_ADMIN_EMAIL
PUBLIC_SITE_URL=https://differancelabs.com
APP_GRANTS_JSON={}
```

Generate `SESSION_SECRET` locally when needed:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

After changing Vercel env vars, trigger a fresh production deployment through the normal GitHub flow. If there are no code changes, use an empty commit and push:

```powershell
git commit --allow-empty -m "Redeploy production"
git push origin main
```

## Current Domains

- differancelabs.com
- www.differancelabs.com
- differancelabs.vercel.app

## Site Intent

The public homepage should remain minimal, quiet, and generic.
Do not add navigation, project links, public contact forms, or references to AdMe, NomNomGo, PIE, Divvi, or other projects unless explicitly asked.

## Safe Update Process

Before making changes:

1. Inspect the repository.
2. Explain the intended change.
3. Edit the minimum files required.
4. Commit and push to GitHub.
5. Confirm Vercel auto-deployed successfully.

## Design Direction

Dark, understated, premium, private-lab feel.

Think:

- research institute
- skunkworks
- private workshop
- incubator

Avoid:

- marketing site
- consulting company
- startup hype
- AI buzzword aesthetic

## Future Architecture

Differance Labs is an incubator and launcher for independent projects.

The long-term structure is:

- differancelabs.com (public homepage)
- admin.differancelabs.com (private control plane)
- adme.differancelabs.com
- nomnomgo.differancelabs.com
- pie.differancelabs.com
- divvi.differancelabs.com

Projects should be designed so they can later move to their own domains without depending on Differance Labs infrastructure.

## Authentication Vision

The Delta logo on the homepage may eventually link to a Google login flow.

After login, users may see an application launcher showing only the apps they have access to.

Any verified Google account may enter the launcher. Users without app grants should see no app cards and may request access through the stubbed access-request flow.

This launcher is an access portal for alpha/beta use and administration.

Production applications should eventually support their own independent authentication systems and must not permanently depend on Differance Labs login.

## Authentication Philosophy

Users are allowed to authenticate with Google even if they have no application access.

Authentication and authorization are separate concerns.

Successful login does not imply access to any applications.

Users without grants should be shown an empty-state experience and offered a Request Access workflow.

Application visibility is determined by grants, not by email allowlists.

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

This AGENTS.md file is authoritative project context.

Before making significant changes:

- Read AGENTS.md.
- Follow deployment instructions.
- Preserve the site's minimalist intent unless explicitly instructed otherwise.
- Keep architecture decisions documented here as the project evolves.
