# Verification and delivery record

Checked September 5, 2026 on the connected Windows computer. This is a working fictional-data implementation verified locally and against an isolated cloud database and the hosted Vercel proof of concept; it is **not yet approved or verified for live student records**.

## Results

| Check | Result / evidence |
| --- | --- |
| Correct repository | `C:\Users\BDM\Documents\GitHub\differancelabs`, remote `DifferanceLabs/differancelabs`, feature branch `feat/art-class-checkin`; initial clean main `7cd35ad242f63a04c9bca1dceba6cbf21232bf50` |
| Dependencies and build | Node 24, locked npm install; strict TypeScript and Vite production build pass. App dependency audit reported zero vulnerabilities at installation |
| Root regression tests | **5 passed**, including existing launcher/grant fallback tests and the new art-specific explicit-grant/token-transport checks |
| App tests | **19 passed** against real local Supabase/PostgreSQL and the Vercel Web Standard handler; includes rewrite-query regression coverage |
| Built PWA browser tests | **12 passed locally and all 12 passed again against the real HTTPS Vercel preview on `09e80d5`**: four workflows in WebKit phone 390×844, WebKit tablet portrait 820×1180, and Chromium tablet landscape 1180×820 |
| Netlify alternative | Pinned CLI 27.5.0 local production build/function packaging **passed**. The HTTP verification passed through its Windows server, including server database identity, atomic handoffs, current roles, payment conflicts, PDFs/CSV and private photos. All **12 built-PWA browser checks passed again through Netlify**, including direct view reloads, lost responses, offline failure, paper reconciliation and shell-only caching. This is local emulation, not a hosted Netlify deployment |
| Printing | Authenticated US Letter PDFs generated; all **3 roster pages and 4 staff-reference pages** rendered and visually inspected, including the long name, repeated headers, saved Paid status, notes space, contacts and fictional-data labels |
| Local persistence | Supabase Docker services active; independent browser cookie jars share server records; reload and foreground polling verified |
| Backup recovery | Encrypted archive restores durable records/events into a separate empty local database, restores no sessions, refuses a second overwrite and leaves the original database unchanged |
| GitHub CI | **Passed on Linux for `09e80d5`**: fresh isolated Supabase setup, 5 root tests, 19 app tests, TypeScript/NodeNext and production builds, optional Netlify packaging, and all 12 built-PWA browser checks. [Verified run](https://github.com/DifferanceLabs/differancelabs/actions/runs/34004754413) |
| Review | Implementation pushed; [draft PR #1](https://github.com/DifferanceLabs/differancelabs/pull/1) contains the reviewable changes. The added opt-in cloud verification script passed against the separate demo database |
| Vercel access / plan | CLI authentication verified as `jmzelnik`; team `differance-labs-projects`, OWNER access, active **Hobby** billing, no Pro trial. Existing project/environment metadata inspected without printing values |
| Cloud database | **Active/Healthy**: separate `art-class-checkin-demo` (`lvfyzarxputeafslrjwe`), same Free organization as existing `differancelabs` (`prlisuyxqxgohznhcefh`); second free slot, no paid add-ons. Only the demo received the app fixture/migration/seed |
| Cloud API verification | **Passed** via `npm run verify:preview`: server handlers executed locally against the cloud HTTPS Data API; independent sessions, persistence, duplicate/concurrent handoffs, payment conflicts, paper payment times, audit history, private PDFs/CSV and logout. Cloud photo upload/retrieval passed; staff uploads and unsigned/public retrieval were rejected |
| Cloud backup | Encrypted full app archive, including the synthetic private reference photo, created from the cloud demo at `backups/art-checkin-2026-09-06T01-49-43.071Z.artbackup`; passphrase stored separately in the owner's protected local task directory. Platform backup count 0; PITR disabled |
| Cloud app preview | Separate Hobby project **art-class-checkin-poc** created through the project API and connected to GitHub. Domain **https://art-class-checkin-poc.vercel.app** assigned to the feature branch; six Sensitive Preview-only variables configured. Hosted HTTP verification **passed** on `09e80d5`, including JSON mutations, filtered history, PDFs/CSV and private photo uploads. Vercel Authentication is off only for this fictional POC |
| Production | **Not deployed**. No live migrations, main merge, subscription purchase, OAuth change, DNS change, or app domain change |

## Risks exercised

The API/database tests reject unsigned direct access, forged identities, missing/revoked grants, staff administration, cross-origin requests, bad CSRF, expired sessions, invalid/expired/wrong-app launch tokens and replayed tokens. They exercise logout, a separate Home Screen cookie jar's device approval, private photo upload/retrieval and public photo rejection. A deliberately lost photo-save response preserves the committed private object.

Transactions were tested for release of a non-Present child, revoked child-specific pickup permission, duplicate requests with the same operation ID and concurrent releases with different IDs. Exactly one handoff persists. Payment remains independent of attendance, works for absent children, uses a separate version, requires reasons for changes and starts unconfirmed in a new session. Archive/name/enrollment edits preserve dated snapshots.

Paper checks include past permission versus current revocation, actual versus recorded times, duplicate reconciliation, conflicts requiring an administrator, immutable original events, paper confirmation times and preserving a newer digital Paid value when paper is blank. CSV tests cover quoting, formula-prefix protection, UTC/local timezone and payment fields. Time conversion tests cover Chicago DST gaps and repeated hours.

Browser checks cover check-in → Paid → approved adult → release, two independent sessions, reload, history filtering, paper entry, private PDF download, lost committed responses, offline failures without false success, touch targets, horizontal layout bounds, and a service-worker cache containing only the app shell. No private APIs or photos enter that cache. Testing uncovered and fixed stale roster responses, stale History results during filtering, print pagination, form label associations and a mobile overflow issue.

## Main-site preservation

The public main-site baseline and post-push checks returned homepage/login 200, protected launcher/launch redirects to login, and unauthenticated session 401 with no-store. These read-only checks do not constitute an authenticated production Google sign-in test. The Google handlers, public homepage, login markup, CSS, protected launcher shell and root routing configuration have not been edited.

Vercel's existing **differancelabs** Git project successfully built this branch. Its [main-site preview](https://differancelabs-git-feat-art-cla-0fa671-differance-labs-projects.vercel.app) redirects visitors to Vercel SSO protection and is **not the art app**. The separate art project is now **art-class-checkin-poc**, using its own settings and cloud demo credentials. Root local `.vercel` metadata remains unchanged.

The main project still serves static files and existing Vercel functions. Root `.vercelignore` excludes this app and internal migrations/docs; this app has its own ignore file and `dist` output. The owner's authenticated Vercel CLI verified deployment `dpl_6F9gDuckzcxYUmahkso3xtE48zr2`: `/projects/art-class-checkin/server/app.ts`, `/projects/art-class-checkin/REQUIREMENTS.md` and `/supabase/migrations/002_art_class_launcher.sql` all return **404**; homepage/login return **200**, `/api/session` returns **401**, and `/apps` returns **302** without a portal session. Vercel's official CLI generated an automation access token for these protected-preview checks; visitor SSO protection stayed enabled, and no token was printed. This verifies published exclusions and unsigned route behavior, but not an authenticated Google/launcher flow. [Vercel exclusion documentation](https://vercel.com/docs/deployments/vercel-ignore).

The hosted proof of concept returns its static HTML shell for unknown non-API paths such as `/server/app.ts` and `/.env.preview`; these are SPA fallbacks, not published source or environment files. Protected API and export requests return 401 without a session and private/no-store headers. The live main homepage/login remain 200, unsigned session 401 and launcher 302 after this preview deployment.

## Every changed file outside this app folder

| File | Why it changed |
| --- | --- |
| `api/_auth.js` | Adds art catalog metadata/env target and emits its documented five-claim launch token; preserves other apps' token format |
| `api/_supabase.js` | Requires an explicit art grant even for the portal administrator; preserves other apps' access behavior |
| `api/apps/launch.js` | Uses a token fragment and no-referrer for art, keeping tokens out of request URLs; preserves other app transports |
| `api/session.js` | Excludes art from degraded admin fallback when its grant cannot be verified |
| `supabase/migrations/002_art_class_launcher.sql` | Prepared, unapplied migration adds one inactive launcher catalog row; no automatic grants |
| `.vercelignore` | Excludes app source/server files, migrations and internal docs from the main static deployment |
| `tests/artClassAccess.test.js` | Verifies the narrow launcher integration and existing-app behavior |
| `package.json` | Limits root Node test discovery to root tests, keeping this app's separate test runner isolated |
| `.github/workflows/art-class-checkin.yml` | Adds repeatable GitHub verification for this app, both hosting builds and the root integration |
| `README.md` | Links app documentation and records the narrowly scoped integration/exclusions |
| `AGENTS.md` | Records the new isolated architecture while retaining all existing migration, deployment, DNS and OAuth guardrails |

## Outstanding owner/account acceptance

Vercel and Supabase device authentication are complete; GitHub access also works. Read-only inspection of the existing Supabase database confirmed its expected `public.users/apps/app_grants` columns and no art tables. Existing Vercel metadata confirms the portal's variables and launch secret exist as Sensitive entries; those values were not retrieved or printed. The new preview's own Supabase secret key and generated database credentials were written directly to private ignored configuration without printing them.

The owner clarified that this deployment is a **Hobby proof of concept**. Vercel remains Hobby at $0 base subscription, with no upgrade/trial. Only fictional demo records and identities are configured. This is not a finding that Hobby permits future paid-business operation. Supabase remains Free, with two free project slots used and $0 added subscription cost. Its actual entitlements show zero backup retention, no backup schedule and pausing enabled. No subscription charge was incurred.

The optional Netlify adapter and [guide](NETLIFY.md) remain available, but the owner deferred Netlify. No Netlify account/project was created and no Netlify login is required for the selected Vercel proof of concept.

Vercel project creation, branch-domain assignment, preview-only configuration, cloud database creation, test migrations, local/cloud API checks and an encrypted cloud app backup are complete. The first hosted check exposed an ESM extension problem; server relative imports now use Node-compatible `.js` specifiers, and an additional NodeNext check is part of every build. The adapter also uses Vercel's Web Standard export for request bodies and removes its generated `path` routing query before strict filter validation. All **19 focused tests passed** from a fresh local fictional fixture after these fixes. The full hosted HTTP verification passed.

Physical iPhone/iPad Safari, Home Screen installation and cookie behavior, AirPrint/Files sharing, two physical devices, actual mobile network interruption and a supervised handoff rehearsal remain untested. No physical Apple device was represented as tested. Hosted demo authorization, private photos, exports, cookies and access behavior are verified. Real portal-token exchange, live grants/configuration, live backup scheduling/restore and production rollback compatibility remain future acceptance work; the proof of concept does not activate those live systems.

The exact account steps and prepared production migration approval are in [TEST-AND-DEPLOY.md](TEST-AND-DEPLOY.md). The proposed final address `https://art-checkin.differancelabs.com` is not an existing app URL.
