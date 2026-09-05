# Test, install and deploy

Prepared September 5, 2026 for an owner working remotely from a phone with Codex on Windows.

**Current addresses:** the runnable local demo is `http://localhost:5173` **on the Windows computer**. The separate cloud demo database is active, but an HTTPS app frontend preview has **not** been created. Vercel and Supabase CLI access work; hosting eligibility remains unresolved. `https://art-checkin.differancelabs.com` is **proposed**, not live. A root-site Vercel preview is not the art app.

Most implementation/testing work below is already completed; it is documented so you can reproduce it. Codex can perform the remaining deployment work once the hosting arrangement is resolved. You do not need to repeat completed account login, database creation or test migrations.

## 1. Select the right project and run setup

**On your phone/iPad, in Codex:** select the existing Differance Labs project. The verified Git checkout is `C:\Users\BDM\Documents\GitHub\differancelabs`. The initially selected `C:\Users\BDM\Documents\DifferanceLabs` was a stale non-Git copy. Open/select the canonical directory on the connected Windows computer; do not initialize another repository. No project-trust error occurred during this run. If a later session shows an untrusted-project error, use Codex's supported Open Folder/trust action for that exact existing directory.

**On the connected Windows computer, PowerShell:**

```powershell
Set-Location C:\Users\BDM\Documents\GitHub\differancelabs
git status --short
git branch --show-current
Set-Location .\projects\art-class-checkin
npm.cmd ci
npm.cmd run demo:setup
npm.cmd run dev
```

Expected branch: `feat/art-class-checkin` during review. Node 24 and Docker Desktop are installed on this computer. Setup starts isolated local Supabase containers and writes an ignored private `.env.local`. Expected output: “Local fictional demo is ready.” Development runs UI port 5173 and API port 5174. Windows can open `http://localhost:5173`; **your phone's localhost is not the Windows computer**. Use the later HTTPS deployment to test remotely.

For a clean fictional reset, stop other demo testing and run `npm.cmd run demo:reset` in this app folder. It is restricted to the app's loopback Docker database and demo mode. It does not reset any cloud database.

## 2. Restore hosting access and create the isolated project

**Already completed:** Vercel CLI authentication was verified as `jmzelnik` on September 5, 2026. Do not repeat login unless it expires. For future reconnection, **on the connected Windows computer**, run `npx.cmd vercel login` from the repository. **On your phone/iPad:** open the generated device authorization URL, sign in to the owner's existing Vercel account, and complete authorization. Enter the CLI's device code, not an authenticator code, when the device authorization page requests it. The agent cannot perform your login/MFA. Regenerate timed-out device codes. Verify with `npx.cmd vercel whoami`.

The repository [AGENTS.md](../../AGENTS.md), section “Vercel CLI Access,” directs login when unauthenticated. CLI access now permits authorized project inspection without requiring a separate dashboard login. The main project's local `.vercel` metadata was preserved.

**Verified in Vercel:** team **differance-labs-projects** is on active **Hobby**, with no Pro trial. Hobby permits personal, noncommercial use. Staff-only access does not itself establish eligibility: Vercel defines commercial use by the purpose of financial gain. The requested paid-art-class workflow is being treated as commercial; Vercel support can confirm an uncertain case. A Pro upgrade would add a $20/month base fee plus applicable taxes and possible usage charges. The owner's instruction prohibits an unapproved purchase, so no upgrade or trial has been started. Resolve this through approved suitable hosting, or confirmation that the actual intended use qualifies for Hobby, before deployment. [Plan terms](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage), [Pro pricing](https://vercel.com/docs/plans/pro-plan).

**In Vercel:** the owner can review the plan under **differance-labs-projects → Settings → Billing**. After hosting is resolved, Codex can create the separate project and verify its allowances; the owner need not manually perform the setup below if connected access is available.

Use **Add New → Project → Import Git Repository → DifferanceLabs/differancelabs**. Name the separate project **art-class-checkin** if available. Use these settings:

| Setting | Value |
| --- | --- |
| Git repository | DifferanceLabs/differancelabs |
| Root Directory | projects/art-class-checkin |
| Framework Preset | Vite |
| Install Command | npm ci |
| Build Command | npm run build |
| Output Directory | dist |
| Node.js | 24.x |
| Production branch | main |
| Preview branch | feat/art-class-checkin; subsequent non-main feature branches |
| Include source files outside Root Directory | Off; this app has its own dependencies |

The app's `vercel.json` supplies these build settings, the private API routing and response headers. Keep all settings on the existing **differancelabs** project intact.

The app folder currently exists on the feature branch. If the import screen only shows main, create/connect the empty project first and select **Deployments → Create Deployment** with Git ref **feat/art-class-checkin**, or have Codex create the same Git-connected project through Vercel's project API and trigger a branch push. Do not promote a preview or use a CLI production upload. [Vercel monorepo guidance](https://vercel.com/docs/monorepos).

## 3. Configure an isolated preview environment

**In Vercel → art-class-checkin → Settings → Environment Variables:** select **Preview** and, where supported, scope to the feature branch. Development uses the ignored local file. Production receives different live values only after review.

| Variable | Public or private | Where its value comes from / environments |
| --- | --- | --- |
| ART_APP_MODE | Server setting; mode is public in the UI | `demo` for Preview/Development; `live` for Production |
| ART_APP_ORIGIN | Public address, configured on server | Exact HTTPS preview/branch alias copied from this project, without a trailing slash; local `http://localhost:5173`; proposed live origin only once verified |
| ART_EXPECTED_DATABASE_ID | Server setting, not a credential | Generated by the matching migration; saved in the private environment file. Must match the database UUID for that environment |
| SUPABASE_URL | Server configuration | Matching Supabase project's **Connect** dialog / Data API URL |
| SUPABASE_SERVICE_ROLE_KEY | **Secret, server only** | Matching project **Settings → API Keys**, service-role/secret server key with service-role RPC access. Never an anon/publishable browser key |
| DL_PORTAL_ORIGIN | Public portal address, server setting | `https://www.differancelabs.com`; app adds `/apps` |
| DL_APP_LAUNCH_SECRET | **Secret, server only** | Same signing secret as the main project, obtained securely from its original protected source; the existing Vercel variable is marked Sensitive. Required only for live portal-token integration. **Do not copy production secrets into the public fictional preview** |
| ART_MIGRATION_DATABASE_URL | **Secret; tooling only, never Vercel** | Supabase **Connect → Session pooler** PostgreSQL connection, including the database password, for approved migrations/backups |
| ART_BACKUP_PASSPHRASE | **Secret; backup tooling only** | Owner-generated long passphrase stored separately in a password manager; minimum 20 characters |
| ART_DATABASE_CA_PATH | Tooling only; certificate path, not a credential | Optional path to the official database CA certificate downloaded from the matching Supabase project's SSL settings; use if that connection requires its CA |
| ART_ENV_FILE | Local tooling selector, not secret | Optional path such as `.env.preview`, `.env.production` or an ignored recovery file |
| VERCEL_GIT_COMMIT_SHA | Build/runtime version, public | Vercel supplies automatically; displayed in the app footer |

There are **no VITE_* credentials** and no browser Supabase key. Transfer secrets directly between approved private settings/files through the connected tools; never paste them into chat, screenshots, commits, GitHub Actions output or public tickets. To edit a private local config, copy `.env.example` to the appropriate ignored environment file, then fill its values securely.

Cloud database tooling requires certificate-verified TLS. If a connection reports a certificate trust error, obtain the matching official CA certificate and set ART_DATABASE_CA_PATH; do not disable certificate verification.

Use one stable branch alias as ART_APP_ORIGIN and open that alias while testing. A different deployment hostname must be explicitly allowed/configured before mutations; the app rejects cross-origin saves. After changing Vercel variables, trigger a fresh Git deployment so they take effect.

## 4. Prepare the cloud test database

**Already completed:** Supabase CLI sign-in works. Organization **Differance Labs** is on Free. The existing project `differancelabs` (`prlisuyxqxgohznhcefh`) is Active/Healthy; read-only inspection confirmed the expected portal access tables and no existing art schema. A separate [art-class-checkin-demo project](https://supabase.com/dashboard/project/lvfyzarxputeafslrjwe) is now Active/Healthy in US East (Northern Virginia). It uses the second free project slot and has no paid add-ons. Its API key, connection and database identity are saved in the app's ignored `.env.preview`. The main database has not been migrated.

For future reconnection only, **on the connected Windows computer**, run `npx.cmd supabase login --no-browser --agent no --output-format text` in this app folder. **On your phone/iPad:** copy the generated URL into the mobile browser where you are signed into Supabase, authorize the Windows login, and enter its one-time verification code into that waiting login. A mobile browser sign-in alone does not authorize Windows. Codex can keep the login running between messages when remote terminal input is unavailable. Use only the latest link/code pair. Keep passwords, API keys and persistent access tokens out of chat. Verify with `npx.cmd supabase projects list --output json`; do not print API key values.

For a future replacement test environment, use an empty, separate project. Both free slots are now occupied, so inspect billing and available capacity before creating another project. An additional project in a Pro organization can add compute charges. Do not seed the existing portal project or implicitly authorize a paid project.

The current preview already has the prepared fixture/migration and fictional seed. To reproduce an approved test setup later, wait for **Active/Healthy**, securely configure the matching environment, then use PowerShell in the app folder:

```powershell
$env:ART_ENV_FILE = ".env.preview"
npm.cmd run db:migrate
Remove-Item Env:ART_ENV_FILE
```

The private file must specify `ART_APP_MODE=demo`. The script refuses a new demo if the public schema contains existing user tables. It applies `supabase/fixtures/demo_access.sql`, `supabase/migrations/001_art_checkin.sql`, and fictional seeds, records migration checksums, and writes the database identity back into the same private file. Copy the identity securely into this app's matching Preview variables. A health request must report `ok: true` before testing.

**Completed on the cloud test project only:** `supabase/fixtures/demo_access.sql`, `supabase/migrations/001_art_checkin.sql`, fictional seeds and migration identity/ledger. Certificate-verified TLS uses the session pooler on port 5432. The private configuration points to `tmp/supabase-production-ca.pem`, containing the production roots from the [official CLI 2021 certificate](https://github.com/supabase/cli/blob/v2.116.0/apps/cli-go/internal/gen/types/templates/prod-ca-2021.crt) and [2025 certificate](https://github.com/supabase/cli/blob/v2.116.0/apps/cli-go/internal/gen/types/templates/prod-ca-2025.crt). No system-wide trust settings were changed. Obtain current certificates from Supabase's database settings if rebuilding this private tooling setup.

To rerun the focused cloud demo verification, **on the connected Windows computer**, from `projects/art-class-checkin`:

```powershell
$env:ART_ENV_FILE = ".env.preview"
npm.cmd run verify:preview
Remove-Item Env:ART_ENV_FILE
```

Expected: `PASS` for cloud identity, unsigned access, independent sessions/persistence, idempotent requests, concurrent release/payment edits, paper payment times, audit history, private PDFs/CSV and logout. This refuses live mode, creates a fictional verification class/session, archives that class and retains its audit/history. Server handlers run locally against the real cloud Supabase API; this is not a hosted-frontend or physical-device test. The normal demo class is **After-School Art Studio**, instructor **Morgan Ellis**. No production migration has been applied.

## 5. Trigger and verify the Git preview

**In GitHub:** the implementation is prepared on `feat/art-class-checkin`. Review its PR and the **Art Class Check-In** workflow. Once the new Vercel Git project and preview database variables exist, have Codex push a task-specific follow-up commit to the branch. A Git-ref deployment from Vercel's **Create Deployment** screen is also a Git-based preview.

The implementation is pushed in [draft PR #1](https://github.com/DifferanceLabs/differancelabs/pull/1), and its [Linux verification passed](https://github.com/DifferanceLabs/differancelabs/actions/runs/33992512958). The existing main project also produced a protected [main-site preview](https://differancelabs-git-feat-art-cla-0fa671-differance-labs-projects.vercel.app). That is a regression-review address for the main site, **not the new art app's preview**.

**In Vercel → art-class-checkin → Deployments:** choose the deployment whose source is **feat/art-class-checkin** and whose commit matches GitHub. Expected build result: **Ready**. Open its branch alias, verify `/api/health` returns `ok: true`, and verify **FICTIONAL DEMO** in the app.

Record the actual alias here after creation: **not available yet — hosting eligibility remains unresolved**. The matching cloud demo database and private configuration are prepared. Replace ART_APP_ORIGIN's local verification address with the actual verified HTTPS branch alias when deploying. Do not infer an address from the project name. A successful build without a working database/authenticated workflow is insufficient. If a build fails, Codex should inspect its log and fix/redeploy the branch before returning it to you.

## 6. Understand preview protection

**On your phone/iPad:** Vercel may first show a Vercel account/access page. This is deployment protection, separate from staff app sign-in. Use the authorized owner's access. Inspect **Vercel → Settings → Deployment Protection** before sharing the preview; leave existing protections intact. Do not place bypass tokens in app URLs or source.

The fictional demo intentionally offers fictional staff/admin identities and must contain no real data. Production must run live mode, require an explicit portal grant, and must never offer demo login.

## 7. Practice a complete fictional class

**On your phone/iPad, at the actual preview alias:** choose **Enter demo as staff**. Under Today choose today's **After-School Art Studio**, or **New session → Class → Session date → Create session**. New dated sessions start Expected with all Paid boxes unchecked.

Find **Aria Martinez**, tap **Check in**, and wait for **Present** and server confirmation. Check **Paid**, then wait for **Confirmed**. Tap **Details** to practice optional Square/Venmo/Cash/Other details. Tap **Pick up**, select an approved adult, choose **Known to staff**, then **Confirm release** at the fictional handoff. Expected result: **Released**, named adult and actual release time. Payment is optional and never gates handoffs.

## 8. Verify another device and persistence

**On your second authorized phone/iPad:** open the same HTTPS alias and sign in separately. Select the identical dated session. Verify the first device's status/payment. Make a different fictional check-in and confirm that the first device refreshes within roughly five seconds or when returning to the foreground.

Reload both pages, close/reopen the app, and confirm saved records persist. Browser tests cover independent cookie jars and reloads; this physical two-device check remains an owner acceptance step.

## 9. Install the stable address on each Home Screen

**On your iPhone:** open the stable HTTPS app address in Safari. Tap **More → Share**, or **Share** directly with the top/bottom tab layout. Scroll to **Add to Home Screen**; if absent, use **Edit Actions** to add it. Turn on **Open as Web App** if shown and tap **Add**. Launch the new icon and sign in if needed. [Apple's current iPhone instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

**On your iPad:** open the same stable address in Safari, tap **Share → More → Add to Home Screen**, enable **Open as Web App** if shown, then **Add**. The icon is installed only on that device. Repeat separately on every device. [Apple's current iPad instructions](https://support.apple.com/guide/ipad/bookmark-a-website-ipadc602b75b/ipados).

For live use, sign in through Differance Labs and its granted Art Class Check-In card. If the installed app has a separate Safari cookie store, choose **Sign in to this Home Screen app**, keep its code visible, and in the already authorized Safari app use **Account → Connect Home Screen device → enter code → Approve my waiting device**. Return to the installed icon. A code expires after five minutes; the app session after twelve hours.

Use a stable deployment alias for demo installation and the verified final domain for live installation. Never install a URL containing a launch token. Changing domains requires installing the new address. Test portrait, landscape, large text, return visits, logout and sign-in after expiry on each physical iPhone/iPad. No Apple Developer Program account or Mac is required for the PWA.

## 10. Print, reconcile and inspect history

**On your phone/iPad:** in Today select the fictional dated class, then **Print backup**. Open both **Attendance roster** and **Staff pickup / contact reference** PDFs. The first has blank actual arrival/departure/adult/initials spaces and saved Paid status plus room for handwritten payment notes. Essential contacts and approved adults are on the separate staff-only reference. Both repeat identifying headers across pages and include a print timestamp.

Use **Open PDF → Share → Print**, choosing US Letter and an available AirPrint printer. To save, use **Save PDF**; open it in Files and use **Share → Print** if standalone printing is unavailable. **Open app in Safari for printing** opens the stable app separately; sign in, select the same session and print again if necessary. Keep the files/sheets private.

Write fictional arrival and departure times in the past, an approved adult, verification method and initials. In Today use that child's **More → Enter paper attendance**. Enter the times in the displayed business timezone; select the adult and verification from paper; enter handwritten initials if available. For paper payment, check its confirmation box and optionally enter the original confirmation time. A blank paper checkbox must preserve an existing digital Paid value.

Tap **Reconcile paper record**, then inspect **History**, filtering Student, Class, Session, date and Payment as needed. Expand the events to compare actual and recorded times and actor. Test a conflicting paper time: staff should receive a conflict; an app administrator can make a reasoned audited correction while preserving the original. Test **Export CSV** and inspect its dates/timezone, quoted names, payment fields and audit events.

## 11. Test interruption with fictional records

**On your phone/iPad:** print first, open a fictional Present child, then temporarily disconnect Wi-Fi/cellular or use Airplane Mode. Attempt a fictional release. Expected: no confirmed release, a connection/uncertain-save message, and instructions to use paper. Reconnect and use **Check save status**; inspect the roster/history before any retry. The same request ID makes retries safe even if the original response was lost.

**On the connected Windows computer:** automated network tests simulate a server commit followed by a lost response, then verify reconciliation and no duplicate handoff. This differs from physical mobile radio testing. Run:

```powershell
Set-Location C:\Users\BDM\Documents\GitHub\differancelabs\projects\art-class-checkin
npm.cmd run check
npm.cmd test
npm.cmd run build
$env:ART_BROWSER_BUILT = "1"
npm.cmd run test:e2e
Remove-Item Env:ART_BROWSER_BUILT
```

Do not interrupt connectivity or experiment with real handoffs during a live class.

## 12. Prepare live database and staff access — approval required

**In Supabase:** inspect the existing portal project's status, billing/usage, database backups and private storage first. The implementation is designed to use its existing `public.users/apps/app_grants`, with separate `art_checkin` tables and a private `art-checkin-photos` bucket. This shares project compute/quota and the server credential but does not mix student rows with unrelated tables.

The concrete migration package is:

| File | Proposed change |
| --- | --- |
| Repository `supabase/migrations/002_art_class_launcher.sql` | Inserts one inactive art launcher catalog row, no grants or existing app updates |
| App `supabase/migrations/001_art_checkin.sql` | Adds private app tables, append-only event protection, transactional API functions, RLS/grants, and private photo bucket |
| App migration tooling | Records immutable migration checksums and stamps the new environment live with a unique UUID |

The root [AGENTS.md](../../AGENTS.md), “Database Changes,” requires: **“Create a migration file. Explain the change. Wait for approval before applying.”** Approval must specifically cover these prepared production changes. No such production migration has been applied. A `--approved-production` command flag is an execution guard, not permission to bypass that instruction.

After approval, Codex can apply the root migration through the existing SQL connection and then run from the app folder:

```powershell
$env:ART_ENV_FILE = ".env.production"
npm.cmd run db:migrate -- --approved-production
Remove-Item Env:ART_ENV_FILE
```

The private file must point to the verified existing portal database and set `ART_APP_MODE=live`. Do not run the demo fixture/seed there. Put the generated identity and matching live server variables in **Vercel → art-class-checkin → Settings → Environment Variables → Production**. Supply the existing launch secret from its original protected source. Vercel metadata confirms the current variable is Sensitive; do not assume it can be revealed from the dashboard or rotate it to recover access. If the original value is unavailable, prepare a separately reviewed integration/credential change before proceeding with live sign-in. Main Google OAuth remains unchanged.

Before activation, prepare the exact target URL and owner/staff emails. After the app deployment and HTTPS are verified, the app catalog needs `APP_URL_ART_CLASS_CHECKIN` in the main project or its art app row URL, and only that row's status changed to active. The intended URL is the verified new subdomain, not an arbitrary redirect. These production configuration/activation changes must be included in the final review. No values were invented or applied in this run.

**In Differance Labs → Admin:** grant the art app explicitly to each approved staff email using **Grant Selected**. The portal owner also needs a grant. Ordinary `member` grants map to app staff. Bootstrap the first app administrator by an approved update to only that person's art grant role:

```sql
-- Replace the placeholder with the reviewed owner's exact verified email.
update public.app_grants set role='admin'
where app_slug='art-class-checkin'
  and user_email='REVIEWED_OWNER_EMAIL';
```

This does not change global portal administration. Later app administrators can change existing art staff roles under **Account → App settings & staff**, with an audit reason. New access grants and revocations remain in the portal.

## 13. Configure the proposed subdomain only after review

**In Vercel → art-class-checkin → Settings → Domains:** after domain-change approval, add **art-checkin.differancelabs.com**. Copy the **exact DNS record type, name and value shown for this project** into the proposed change for review.

**In Cloudflare:** only after the required approval, create that specific new record using Vercel's supplied value. Do not guess a CNAME/IP, modify apex/www records, change nameservers, change Google OAuth, or alter existing app domains. No DNS values can be provided yet because this separate hosting project has not been created.

Wait for Vercel to show **Valid Configuration** and a valid HTTPS certificate, then set the app's live ART_APP_ORIGIN to the verified origin. Keep demo preview variables separate.

## 14. Publish through the approved Git flow

**In GitHub:** review the feature PR, its root-file inventory and passed checks. Only after the specific production review/approval, merge the approved changes into **main**. Vercel deploys from GitHub main. Do not manually upload production files or substitute a Vercel CLI production deployment.

**In Vercel:** verify the separate art project deployed the expected main commit. Also verify the existing Differance Labs site's deployment. Main root exclusions prevent app source/server/migrations from becoming static files. The main homepage, login, launcher and other apps must still work.

**On your phone/iPad, using fictional acceptance records in an isolated test environment first:** verify HTTPS, direct-API rejection without a session, actual authorized launcher exchange, missing/revoked grants, logout/reopen, two-device persistence, private photos/exports, atomic release and paper fallback. Ensure the live app has no demo sign-in.

**In Supabase:** verify private schema permissions and storage, active backend and the selected plan's actual backup retention. Perform an app backup and isolated restore drill before real records. Finish a supervised physical handoff rehearsal on each supported iPhone/iPad. Only then use live student records.

## 15. Daily administration, updates and recovery

**On your phone/iPad:** use [STAFF-GUIDE.md](STAFF-GUIDE.md). Add students/adults/classes as an app administrator, create each dated session, and print before class. Shared adults require a separate approved link for each child.

**In Differance Labs → Admin → Current Grants:** remove a staff member's art grant to revoke access. Existing app sessions are rechecked server-side on every private operation; the UI clears on its next poll or request. A device already showing a previously delivered record cannot be remotely made to forget a photograph or screenshot. Sign out shared devices and use passcodes.

**On another device:** grant its operator's identity, open the verified stable URL, install the icon, and sign in. Device sign-in never creates an access grant.

**On the connected Windows computer / In GitHub:** develop updates in this same app folder on a feature branch, run focused checks and the demo workflow, push, review the app preview, then merge approved changes to main. Use additive versioned SQL migrations and an explicit approval if production schema changes are needed. Never edit an already recorded migration checksum.

**On your phone/iPad:** the footer identifies the current Git commit prefix. After an update, close/reopen the app between classes and verify the expected version. The service worker waits for a new visit instead of forcing an update during a handoff.

**If a release save fails:** keep the child Present until the physical handoff is correctly recorded. Check uncertain-save status, inspect History and coordinate with the other staff member. Use the printed sheet during an outage. Reconcile afterward or make an audited admin correction; do not repeatedly issue fresh release requests.

### Backup, restore and retention

**On the connected Windows computer:** configure the live private tooling file and a separate strong ART_BACKUP_PASSPHRASE in the owner's password manager. Run after daily reconciliation and before any migration:

```powershell
Set-Location C:\Users\BDM\Documents\GitHub\differancelabs\projects\art-class-checkin
$env:ART_ENV_FILE = ".env.production"
npm.cmd run backup
Remove-Item Env:ART_ENV_FILE
```

Expected: an encrypted `backups/art-checkin-TIMESTAMP.artbackup` plus a SHA-256 checksum. Copy the encrypted file to the owner's protected backup location and keep the passphrase separately. Do not print or commit the secret. Backup tooling uses a consistent database snapshot, includes all durable app tables and migration SQL, and downloads current/historical referenced private photo objects. It is a full app logical backup, not a whole-project Supabase backup. CSV omits recovery structure and is not a substitute.

**Retention implemented:** app records, original events, paper snapshots and confirmation history are kept indefinitely; normal staff screens offer no destructive completed-session deletion. Encrypted backup files also remain until an authorized owner removes them. **Proposed operational policy:** keep 30 daily and 12 monthly encrypted copies, test restoration monthly, and have the owner choose a student/paper retention policy before live use. No scheduled off-computer backup or automatic pruning was enabled by this run.

**In Supabase:** Free does not include automatic database backups and may pause after a week of inactivity. Pro/Team/Enterprise publish daily retention of 7/14/up to 30 days respectively. Verify what the actual project's Backups screen provides. Storage objects are not part of its database-only backup, so retain the encrypted app archive's photos too. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

**Restore drill, on the connected Windows computer / In Supabase:** provision a separate empty recovery database, apply the matching schema and access-table structure, set it to **live** mode to keep demo login disabled, and record its new identity in an ignored `.env.recovery`. Do not attach it to a public preview or seed demo access for real records. Use the original backup passphrase:

```powershell
$env:ART_ENV_FILE = ".env.recovery"
npm.cmd run restore -- .\backups\SELECTED_TIMESTAMP.artbackup
Remove-Item Env:ART_ENV_FILE
```

Restore refuses a nonempty app schema or the original database identity. It restores durable records and referenced private photos and deliberately does not revive sessions or access grants. Compare counts, actual/recorded times, event sequences, Paid history and photo retrieval in the isolated recovery environment. The local automated drill has verified record recovery and refusal to overwrite existing records.

A recovery database is for inspection until a reviewed cutover is ready. Live access checks must continue using the **current portal grants**; do not switch only the app to an old copied grant table. For actual recovery into the existing shared project, prepare an app-only recovery migration/reconciliation from the inspected archive, keep the original app data for investigation, and obtain production approval. Do not click whole-project Restore casually: it would affect unrelated apps and portal access too.

## 16. App-only rollback

**On the connected Windows computer / In GitHub:** identify the last verified art app commit from its Vercel deployment and footer. Prepare a branch that restores only compatible app source/build files from that commit, preserving newer migration files and records. Review and merge the app-only rollback through GitHub main after the applicable production approval. Do not revert unrelated main-site work or whole mixed commits.

**In Vercel:** keep rollback scoped to **art-class-checkin**. The repository's normal rollback path remains a reviewed Git commit; do not use a manual production upload. If a separate emergency instant-rollback operation is specifically authorized later, check its database compatibility first.

**In Supabase:** a front-end/function rollback does not undo a migration. Retain additive columns/functions needed by old and new code; use a forward compatibility fix when needed. Never drop attendance, events or payment rows to make an older build run. Keep the same live database, bucket and current grant source. Use the recovery procedure only for a data problem.

**On your phone/iPad:** reopen between classes, verify the expected footer version and correct session, test a fictional save through the isolated preview, then verify authorized live access/persistence. The main site's homepage, login, existing apps and database records remain intact.
