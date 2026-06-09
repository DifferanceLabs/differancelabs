# Differance Labs

Minimal public homepage for differancelabs.com with a Google-authenticated app launcher.

## Structure

- `index.html` is the public homepage.
- `login/index.html` is the Google login page at `/login`.
- `apps/index.html` is the authenticated launcher page at `/apps`.
- `api/apps-page.js` gates `/apps` before serving the launcher shell.
- `api/auth/google.js` starts Google OAuth.
- `api/auth/callback.js` completes Google OAuth and creates the session cookie.
- `api/session.js` returns the signed-in user and app cards allowed for that email.
- `api/logout.js` clears the session cookie.
- `api/_auth.js` contains the shared session and entitlement logic.
- `styles.css` contains the public homepage styles.
- `portal.css` contains login and launcher styles.
- `assets/mark.svg` contains the Differance Labs mark and favicon.

## Environment Variables

Create these in Vercel project settings. For local `vercel dev`, put them in `.env.local`.

```text
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://differancelabs.com/api/auth/callback
SESSION_SECRET=generate-a-long-random-secret
ALLOWED_ADMIN_EMAIL=you@example.com
ALLOWED_EMAILS=
APP_GRANTS_JSON={}
PUBLIC_SITE_URL=https://differancelabs.com
```

`ALLOWED_ADMIN_EMAIL` is the admin email. That account sees Admin, AdMe, NomNomGo, PIE, Divvi, Prosperity Platform, and Crieve Hall Plumbing.

`ALLOWED_EMAILS` is a comma-separated allowlist for users who may sign in but do not automatically receive app cards.

`APP_GRANTS_JSON` grants app cards to non-admin users. Keys may use app keys or app names.

```json
{
  "teammate@example.com": ["adme", "nomnomgo", "Crieve Hall Plumbing"]
}
```

Supported app keys:

```text
admin
adme
nomnomgo
pie
divvi
prosperity-platform
crieve-hall-plumbing
```

App card URLs are optional and configured with env vars:

```text
APP_URL_ADMIN=
APP_URL_ADME=
APP_URL_NOMNOMGO=
APP_URL_PIE=
APP_URL_DIVVI=
APP_URL_PROSPERITY_PLATFORM=
APP_URL_CRIEVE_HALL_PLUMBING=
```

Cards without a URL still appear for allowed users, but they are not clickable.

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

## Local Preview

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
ALLOWED_EMAILS=
APP_GRANTS_JSON={}
PUBLIC_SITE_URL=http://localhost:3000
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

Redeploy by committing and pushing changes that affect auth, app grants, app URLs, or site files.
