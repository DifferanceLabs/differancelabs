# Art Class Check-In

A staff-operated, online-first Home Screen web app for elementary art classes. It runs independently of the Differance Labs static site. Parents need no account or device. Square and Venmo remain separate; Paid is a manual confirmation for one student in one dated session.

**Delivery status:** implemented and verified locally and against a separate cloud Supabase demo with sixteen fictional students. Both Vercel and Supabase CLI access work. The cloud demo database is active; the hosted frontend preview and production are not live because hosting eligibility remains unresolved. See [TEST-AND-DEPLOY.md](TEST-AND-DEPLOY.md) for the remaining hosting decision and deployment sequence. No real student information should be entered until deployed authorization, physical-device handoffs, and live backups have been verified.

The proposed production address is **https://art-checkin.differancelabs.com**. It has not been configured or deployed. The local address is **http://localhost:5173 on the connected Windows computer**, not your phone.

## Start locally

The verified Git checkout is `C:\Users\BDM\Documents\GitHub\differancelabs`, on branch `feat/art-class-checkin`. The originally selected `C:\Users\BDM\Documents\DifferanceLabs` was a separate, non-Git copy; it was not edited.

```powershell
Set-Location C:\Users\BDM\Documents\GitHub\differancelabs\projects\art-class-checkin
npm.cmd ci
npm.cmd run demo:setup
npm.cmd run dev
```

Node 24 and Docker Desktop must be running. Setup uses app-specific Supabase containers and ports 55320–55322, generates a private ignored `.env.local`, and seeds fictional records. Open `http://localhost:5173` on Windows. Choose **Enter demo as staff** or **Enter demo as app administrator**. Local records persist in Docker volumes across reloads/restarts and are shared by browser sessions. Docker is for local development only; deployed records require cloud Supabase.

Use `npm.cmd run demo:reset` to reset only this local fictional schema. It verifies the loopback database port and database mode before resetting; it never reaches the cloud. Stop development with Ctrl+C. Do not reset while another person is testing this demo.

## Structure and boundaries

| Area | Choice / boundary |
| --- | --- |
| Front end | React + TypeScript + Vite; Today, Students, Classes, History. No root framework migration. |
| Server | Hono on a Node Vercel function, portable to a Node server using `server/dev.ts`. Every private operation reaches PostgreSQL authorization. |
| Deployment | A separate Vercel project, proposed name `art-class-checkin`, same Git repository, Root Directory `projects/art-class-checkin`. No changes to the main project's local Vercel link. |
| Live database | Proposed: the existing portal Supabase project, private `art_checkin` schema and private `art-checkin-photos` bucket. Tables, events, sessions, idempotency records and print snapshots belong only to this app. |
| Shared live resources | PostgreSQL compute, storage quota, project failure/backup domain, server credential, and existing `public.users/apps/app_grants` access records. The app reads current grants; app administrators can change only an existing art grant's staff/admin role. No unrelated app records are edited. |
| Demo/preview | Active Supabase project `art-class-checkin-demo` (`lvfyzarxputeafslrjwe`), separate from existing `differancelabs` (`prlisuyxqxgohznhcefh`), with fictional access fixtures, database UUID, secrets and mode. Production variables must never be assigned to Preview. Local Docker is a third, independent test environment. |
| Portability | Source/build and migrations stay within this folder. Moving domains requires changing server origin and launcher target. A future database move must replace the narrow grant adapter in `art_checkin.grant_for` or securely connect it to the portal. |

App migrations are under this app's own `supabase/migrations`. The single root migration registers an **inactive** launcher entry. Both require explicit approval before production application under the root [AGENTS.md](../../AGENTS.md). No production migrations were applied.

## Authentication and privacy

Google OAuth remains in the existing portal. The new launcher card requires an explicit art grant, including for the global portal administrator. It does not confer global admin access.

For this app only, the launch redirect carries the signed token in a URL fragment. `public/launch.js` removes it synchronously before loading React; the server validates HS256, exactly the five documented claims, app slug, 180-second maximum lifetime, clock/expiration checks and nonce uniqueness. A token is consumed once in PostgreSQL. Other apps keep their current token format/transport.

The app exchanges it for an opaque, hashed server session with a 12-hour absolute lifetime and a Secure, HttpOnly, SameSite=Lax, host-only cookie. Every private read/write/export/photo RPC locks and rechecks the active app and explicit current grant. Revocation blocks subsequent requests from existing devices; the visible roster polls every five seconds and refreshes on return. A response already sent to a device cannot be recalled.

Mutations require the configured same origin plus a session-bound anti-CSRF token. The service key and launch secret never enter the browser build. RLS and revoked direct grants prohibit anonymous/authenticated table/RPC access. Only the server service role can invoke the narrow public RPC entry points. The service key remains a privileged shared-project credential and must be protected accordingly.

The stable URL has its own sign-in screen; it does not need an old launch token. If Safari sign-in does not carry into an installed Home Screen app, the app supports a five-minute, single-use device code approved from an already authorized app session. Each new device still needs a current grant. Logout revokes its server session and clears private React state. Use device passcodes and keep staff devices under staff control.

Only static shell assets can enter the service-worker cache. APIs, PDFs and reference photos use private/no-store responses and are never service-worker cached. No offline handoffs are queued. An uncertain request retains only its random operation ID in session storage; request details remain in memory. Check its server result before retrying the same request ID. After a reload, inspect the roster/history and reconcile paper if the original request details are unavailable.

## Records and safety

Releases and permission changes serialize in PostgreSQL. A release rechecks Present status, this child's current approved adult, and attendance version at commit. Double taps/retries share an operation ID; independent racing requests receive a conflict. Payment has its own version so it cannot block attendance.

Sessions snapshot the student name/contact and class/instructor/timezone. Current authorization is shown at release and an authorization/adult snapshot is stored with the release. Archive and enrollment edits do not alter dated history. Events are append-only; admin corrections require a reason and preserve the original event.

Paper entry separates actual handoff/confirmation times from later entry times and actor. Historical permission is checked against permission events at the recorded departure; an admin can document a past authorization discrepancy without granting a new pickup now. A blank paper Paid box preserves the digital confirmation. Existing conflicting records require reconciliation, not silent replacement.

All stored instants use PostgreSQL `timestamptz`; display defaults to America/Chicago. DST gaps are rejected; repeated local times require selecting an occurrence. Existing sessions retain their original timezone. Amounts are optional integer US cents. No financial credentials are collected.

## Verify

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium webkit
$env:ART_BROWSER_BUILT = "1"
npm.cmd run test:e2e
Remove-Item Env:ART_BROWSER_BUILT
```

The integration tests require the isolated local demo on port 55322 and exercise real PostgreSQL transactions. Browser tests use fictional dated sessions in WebKit phone/tablet emulation and Chromium tablet landscape. They are not physical iPhone/iPad tests. Run `npm.cmd run demo:reset` afterward for a clean sixteen-student demonstration.

See [VERIFICATION.md](VERIFICATION.md) for results, [STAFF-GUIDE.md](STAFF-GUIDE.md) for daily operation, [TEST-AND-DEPLOY.md](TEST-AND-DEPLOY.md) for deployment/backup/rollback and [OPTIONAL-IOS.md](OPTIONAL-IOS.md) for later native choices. The complete two-message request is preserved in [REQUIREMENTS.md](REQUIREMENTS.md).

## Cost and availability, checked September 5, 2026

**Verified September 5, 2026:** Vercel CLI is authenticated as `jmzelnik`; team `differance-labs-projects` has active **Hobby** billing, with no Pro trial. Its base subscription is $0. Supabase organization **Differance Labs** (`lmrwfuvygljpwbuxmkup`) is on **Free**. Its existing `differancelabs` database and new isolated `art-class-checkin-demo` database report Active/Healthy. The preview uses the second free project slot, has no paid add-ons and adds **$0/month** in subscription charges. No subscription was purchased.

Vercel Hobby is limited to personal, noncommercial use. Its definition concerns a deployment's purpose of financial gain; private access alone does not establish eligibility. Given the requested use for paid art classes, the working interpretation is commercial use. Vercel support can confirm eligibility if the intended use is different or uncertain. Vercel Pro currently has a $20/month platform fee including one deploying seat and a $20 usage credit; extra deploying seats are $20/month, with usage overages and taxes possible. This team does not already have Pro coverage, so upgrading would introduce a subscription charge and needs the owner's approval. A different host with suitable terms remains an option; none has been selected. [Hobby terms](https://vercel.com/docs/plans/hobby), [commercial-use definition](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage), [Pro plan](https://vercel.com/docs/plans/pro-plan).

Supabase Free lists 500 MB database, 1 GB file storage, 5 GB uncached plus 5 GB cached egress, and two active projects; inactive projects may pause after a week and automatic database backups are not included. Pro starts at $25/month, includes the first Micro project through compute credits, 8 GB database, 100 GB file storage and 250 GB egress; extra projects start around $10/month. A shared app schema does not itself add a project fee but uses shared quotas. A preview in a paid organization can therefore cost extra; do not create it without verifying no new charge or obtaining approval. [Supabase pricing](https://supabase.com/pricing), [inactivity pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

Actual Free entitlements report zero backup retention days, no backup schedule, and pausing enabled; the new preview lists no platform backups and PITR disabled. An encrypted app backup was successfully created from this cloud demo. Published Supabase daily backup retention is seven days on Pro, fourteen on Team, and up to thirty on Enterprise. Database backups do not include Storage file contents. This app supplies encrypted, app-only logical backup/restore tools, but no unattended cloud backup job has been configured. The owner must establish and verify a backup schedule before live use. [Supabase backups](https://supabase.com/docs/guides/platform/backups).

The PWA has no Apple membership fee and needs no Mac. Domain renewal remains the existing owner's expense. Budget cannot honestly be stated as $0 recurring until current service plans and usage are inspected.
