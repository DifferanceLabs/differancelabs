# Optional free hosting for the fictional preview

Prepared September 5, 2026. The preferred Vercel team is on Hobby, and paid-class business use is being treated as commercial. No Vercel subscription purchase is authorized. This app also includes a Node function adapter and `netlify.toml` for a separate Netlify project, using the **same Git repository and Supabase demo**. The main site stays on Vercel. No Netlify cloud project or app URL exists yet; account authorization is required.

Netlify explicitly permits commercial projects on Free. Its current Free credit plan provides 300 credits/month with a hard limit; when exhausted, sites pause until the next billing cycle or an owner-approved upgrade. There is no automatic paid overage on Free. Actual account plan/capacity must be checked after login. This is suitable for a fictional preview subject to those limits; do not claim an availability guarantee for live handoffs. [Commercial eligibility](https://www.netlify.com/blog/introducing-netlify-free-plan/), [current pricing](https://www.netlify.com/pricing/), [pausing](https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/).

## 1. Connect the account from your phone

**On the connected Windows computer:** Codex can create a Netlify login ticket, using its official agent-assisted flow:

```powershell
Set-Location C:\Users\BDM\Documents\GitHub\differancelabs\projects\art-class-checkin
npx.cmd --yes netlify-cli@27.5.0 login --request "Authorize Codex to deploy the isolated Art Class Check-In fictional preview" --json
```

**On your phone/iPad:** copy the generated `app.netlify.com/authorize?...` URL into your regular browser. Sign in to your own Netlify account and authorize the requested CLI connection. If you do not have an account, account creation is your action; select Free and do not select a paid trial. Signing into Vercel or Supabase does not connect Netlify. Do not send passwords or persistent tokens to Codex. Tell Codex when authorization is complete; no authenticator code needs to be pasted into this conversation.

**On the connected Windows computer:** Codex checks the saved ticket and confirms the account. The CLI stores its credential locally without printing the access token:

```powershell
npx.cmd --yes netlify-cli@27.5.0 login --check SAVED_TICKET_ID --json
npx.cmd --yes netlify-cli@27.5.0 status --json
```

Expected: `authorized`, then `loggedIn: true`. A pending/denied/expired ticket needs completion or a newly generated link. Codex can perform the remaining setup through the authenticated API/CLI. GitHub may separately request permission for its Netlify integration; if required, authorize only **DifferanceLabs/differancelabs**. No new repository is needed.

## 2. Create the separate demo project through Git

**In Netlify:** verify the team plan and available credits first. Use **Add new project → Import an existing project → GitHub**, choosing **DifferanceLabs/differancelabs**. Codex can configure this using connected access; these settings document the intended result.

| Setting | Demo-only value |
| --- | --- |
| Name | `art-class-checkin-demo`, if available; record the actual assigned name |
| Repository | `DifferanceLabs/differancelabs` |
| Branch to deploy | `feat/art-class-checkin` |
| Base directory | `projects/art-class-checkin` |
| Package directory | Leave unset when the base directory is the app folder |
| Build command | `npm run build` |
| Publish directory | `dist`, relative to the base directory |
| Functions directory | `netlify/functions`, relative to the base directory |
| Node version | 24; supplied by `netlify.toml` |

This project's primary URL is a **fictional demo**, even though Netlify calls its selected branch the project's production branch. The main Differance Labs production branch/project stays unchanged. A live app would use a different hosting project/configuration after production review. Do not put real records into this demo or grant it live credentials. [Monorepo settings](https://docs.netlify.com/build/configure-builds/monorepos/), [Node functions](https://docs.netlify.com/build/functions/overview/).

## 3. Transfer preview configuration securely

**In Netlify → this demo project → Project configuration → Environment variables:** set the following from the existing private `.env.preview`. Use Functions scope where available; if the plan offers only all scopes, the variables remain build/server configuration, and no `VITE_*` credentials may be created.

| Variable | Source |
| --- | --- |
| `ART_APP_MODE` | `demo` only |
| `ART_APP_ORIGIN` | Actual assigned stable HTTPS `*.netlify.app` primary URL, without a trailing slash |
| `ART_EXPECTED_DATABASE_ID` | Already prepared demo database identity |
| `SUPABASE_URL` | Already prepared `art-class-checkin-demo` database |
| `SUPABASE_SERVICE_ROLE_KEY` | That demo's private server secret key only |
| `DL_PORTAL_ORIGIN` | Existing portal address from private configuration |

The app footer and health response identify the Netlify deployment ID; find that deployment under **Deploys** to see its exact Git commit. Netlify supplies `COMMIT_REF` during builds for the app-shell cache version, but it does not supply that variable to function runtime. Do **not** transfer migration/database passwords, backup passphrases, local CA paths, or the live portal launch secret to this public fictional demo. These settings must never be shared with a future live project. The environment classifications and database setup in [TEST-AND-DEPLOY.md](TEST-AND-DEPLOY.md) still apply. [Function environment availability](https://docs.netlify.com/build/functions/environment-variables/).

## 4. Deploy, verify and record the real address

**In GitHub:** push the reviewed feature branch. The connected Netlify Git integration must build that commit automatically. Do not substitute a manual upload. **In Netlify → Deploys:** wait for **Published**, inspect build/functions results, and copy the actual HTTPS primary URL. There is no guessed URL in this guide.

**On your phone/iPad:** open the stable URL and expect **FICTIONAL DEMO** with the two demo sign-in buttons. All people/records in this project are fictional; the demo sign-in buttons are not a live authentication bypass. If deployment access protection is configured, complete that separately before app sign-in. Do not rely on hiding a URL as a privacy boundary.

**On the connected Windows computer:** Codex can test the actual hosted function using the same focused check:

```powershell
$env:ART_ENV_FILE = ".env.preview"
npm.cmd run verify:preview -- --http https://ACTUAL-DEMO-HOST
Remove-Item Env:ART_ENV_FILE
```

Replace the placeholder only with the assigned, verified app URL. Expected: health, protected APIs, shared sessions, handoffs, payment conflicts, paper times, PDF/CSV, private photos and logout pass. This uses fictional records and retains its audit history. It does not prove physical-device behavior. Then follow steps 7–11 in [TEST-AND-DEPLOY.md](TEST-AND-DEPLOY.md) for phone/iPad workflow, printing, paper reconciliation, installation and network tests.

If a build/function fails, Codex should inspect it, fix the app folder, commit and push again. Keep private environment values out of logs. `netlify.toml` publishes only `dist`; server source and ignored environment files are not static assets. PDFs include their packaged font files. The function reuses the same app authorization and database operations, with the hosting platform's trusted client IP used for rate limits.

## 5. Reproduce the adapter checks on Windows

**On the connected Windows computer:** run this from the app folder. Docker/local demo setup from the main guide must already be ready.

```powershell
npx.cmd --yes netlify-cli@27.5.0 build --offline --context deploy-preview
npm.cmd run dev:netlify
```

The helper loads the ignored `.env.local` by default, refuses live mode, runs the built app at `http://localhost:8888`, and passes private values through the process environment. The local address is for Windows only. It does not change your saved environment file. In a second Windows terminal:

```powershell
Set-Location C:\Users\BDM\Documents\GitHub\differancelabs\projects\art-class-checkin
$env:ART_ENV_FILE = ".env.local"
npm.cmd run verify:preview -- --http http://localhost:8888
Remove-Item Env:ART_ENV_FILE
$env:ART_BROWSER_URL = "http://localhost:8888"
$env:ART_BROWSER_BUILT = "1"
npm.cmd run test:e2e
Remove-Item Env:ART_BROWSER_URL
Remove-Item Env:ART_BROWSER_BUILT
```

Stop the local server with Ctrl+C. `ART_BROWSER_URL` makes the browser suite use the already running adapter instead of starting the default development server. These are automated checks, not physical iPad/iPhone tests.

## 6. Updates, rollback and eventual live use

**In GitHub:** app updates remain commits on this project's connected branch. For an app-only rollback, revert the offending app changes on the branch and push; verify the resulting Netlify deployment. Do not roll back the database blindly: its current schema must remain compatible with the selected code, and immutable attendance/payment history must survive. The existing migration ledger and encrypted app backup/recovery process still apply.

Before live use, prepare a separate live hosting project tied to reviewed `main`, obtain the repository-required production migration/integration approval, verify current grants and portal launch exchange, configure backups, and complete physical handoff tests. The proposed custom domain remains `art-checkin.differancelabs.com`. Any DNS record must come from the chosen live project's actual domain setup screen and requires the existing DNS authorization. Do not modify the main site's records or move its Vercel project.
