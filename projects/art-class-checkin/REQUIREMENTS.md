Build a working art-class check-in app inside my existing Differance Labs project.

I am working remotely from my phone using Codex connected to my Windows computer. There is no existing art-class app. Use the selected differancelabs project as the workspace and create the new app within it. I want its code and deployment kept separate from the main Differance Labs application, while hosting it under my Differance Labs domain.

I currently do not have an Apple Developer Program account. This app will be used on only a few iPads/iPhones. Build a Home Screen web app first so I can test and use it without an App Store submission. A native iOS app is a possible later step, not a prerequisite.

Implement the application, verify it, and provide explicit instructions for testing, installation, deployment, and daily use.

Execution mandate: one continuous run unless genuinely blocked

I want you to one-shot this task: inspect, implement, run it, test, fix problems, and deploy the working preview in one sustained execution. You may organize the work into internal phases, but do not stop after planning, scaffolding, or completing only part of the app.

I authorize ordinary implementation work, dependency installation, focused tests, creating a feature branch, committing task-specific changes, pushing that branch, and preparing/deploying an isolated preview using existing authorized accounts and the approved Git workflow. Creating a separate hosting project is authorized if it adds no new subscription charge and is permitted by the account. Preserve unrelated changes.

Make reasonable decisions yourself. Do not ask me to approve your plan, choose a framework, confirm routine edits, or tell you to continue. Debug failures and try reasonable alternatives before declaring a blocker. Complexity, multiple steps, and an initial build failure are not hard blockers.

A hard blocker means something you genuinely cannot resolve with authorized access: for example, missing account access or secrets that cannot be obtained securely, required interactive login/MFA, an unapproved purchase, or a specific production-change approval required by applicable instructions and not already covered by my authorization. Do not bypass access controls or modify instructions to remove such a requirement.

If a hard blocker occurs, finish all remaining independent work first, then give me one concise, consolidated request stating the exact blocker, what you tried, why my action is required, and the precise step I must take. Leave the implementation and proposed changes ready for review. Otherwise, continue through verification and delivery without an intermediate permission checkpoint.

1. Start in the existing project and preserve the main site

- Inspect the working directory, Git status, README, AGENTS.md, applicable nested instructions, hosting configuration, and existing authentication before editing.
- The expected repository is DifferanceLabs/differancelabs. The known Windows checkout is C:\Users\BDM\Documents\GitHub\differancelabs; verify the actual location instead of assuming it.
- The existing site uses static pages, Vercel serverless functions, Google sign-in, Supabase, and an app launcher with individual app grants. Verify the current implementation; do not assume the root is a React or Next.js application.
- Create a feature branch such as feat/art-class-checkin. Preserve unrelated work and do not reset, overwrite, or delete existing changes.
- Put the new application in projects/art-class-checkin/, unless repository instructions establish a better isolated location. Give it its own package.json, lockfile, source, tests, environment example, build configuration, and documentation.
- Keep the existing Git repository. Do not initialize another repository inside it or create an unrelated standalone checkout.
- Do not migrate the main site to a different framework or change its homepage, styling, public navigation, existing apps, or Google OAuth flow to accommodate this app.
- Limit root-level changes to necessary, narrowly scoped integration, deployment exclusions, documentation, and migrations required by repository conventions. Explain each such change.
- Save this complete prompt as REQUIREMENTS.md within the new app folder.
- If project trust prevents the session from starting, identify the exact error and the supported action needed to open/trust the existing Differance Labs directory on the connected computer. Do not attempt to bypass trust checks or treat a different prompt as a way around them.

Read the actual "repository instructions" (https://github.com/DifferanceLabs/differancelabs/blob/main/AGENTS.md) and "README" (https://github.com/DifferanceLabs/differancelabs/blob/main/README.md); they may have changed.

2. Hosting and separation

- Prefer a separate Vercel project connected to this same GitHub repository, with its Root Directory set to projects/art-class-checkin. Keep its build settings, environment variables, deployment URLs, and rollback independent of the main site's Vercel project. Vercel supports importing multiple projects from one repository with different root directories: "Vercel documentation" (https://vercel.com/docs/monorepos).
- Do not relink the main site's local Vercel configuration to the new project.
- My preferred final address is https://art-checkin.differancelabs.com. This is a proposed new address, not a claim that it already exists.
- First prepare an isolated HTTPS preview using fictional data so I can test from my phone without DNS changes. Use the repository's supported Git deployment workflow.
- A subdomain under Differance Labs is acceptable and preferred for isolation. Do not add broad rewrites or place the app in the main site's protected /apps route just to force it onto a subpath.
- Keep app code portable enough to move to another repository or domain later.
- Check how the root static site publishes files. Exclude new app source/build artifacts as needed so the main site's deployment does not accidentally publish files intended only for the new app's server.
- Use persistent cloud storage for live records. Inspect existing Supabase resources and select an inexpensive, maintainable arrangement with app-specific tables/schema or a separate app database. Explain which data resources are shared and which are isolated.
- Never change existing app tables or mix student records with unrelated application data. Keep preview/demo data separate from production, with separate configuration and access boundaries.
- Verify the chosen backend is active. Document actual plan limits, inactivity pausing, storage, backups, and ongoing costs.
- Check commercial-use eligibility of the actual hosting plan. Do not describe a personal-use free plan as appropriate for this business without checking its terms; Vercel's Hobby plan restricts use to personal, noncommercial projects: "Vercel Hobby documentation" (https://vercel.com/docs/plans/hobby).
- Do not purchase subscriptions, change existing DNS/OAuth settings, apply production database migrations, or merge to main without any specific approval required by the repository or account.
- Complete the code, tests, migration files, preview preparation, and exact proposed changes before asking for a required approval. Name the instruction that requires it and explain precisely what I am approving. Do not repeatedly ask whether to continue.
- Follow the repository's GitHub-based production deployment workflow. Do not substitute manual uploads or a Vercel CLI production deployment where repository instructions prohibit them.

3. Simple product scope

Build a staff-operated app for an elementary art business handling parent drop-off and pickup.

- Optimize for iPhone portrait and iPad portrait/landscape in Safari, including Home Screen web-app mode.
- Use a small, maintainable TypeScript stack within the isolated app folder.
- Use a calm, uncluttered design, large student names, readable status labels, accessible contrast, and touch targets at least 44 pixels.
- Staff operate the app; parents need no account, phone, or installation.
- Version one uses staff verification of approved pickup adults. Do not build QR pickup, parent accounts, text messaging, registration/booking, or a full childcare-management system.
- Square and Venmo remain separate payment tools. Track manual payment confirmation only; no payment processing or integrations.
- Use an editable business name, initially “Art Class Check-In.”
- Keep primary navigation to Today, Students, Classes, and History.
- Save live records on the server so the same information is available on each authorized device. Browser storage alone is insufficient.

4. Staff sign-in and app access

- Reuse the existing Differance Labs identity and app-grant system through a narrow integration where practical. Do not rewrite the working Google sign-in flow.
- Add a launcher entry visible only to users explicitly granted this app. A Differance Labs login by itself must not grant access to student records.
- Inspect and correctly implement the existing app-launch protocol. If it supplies a signed, short-lived launch token, validate its signature, intended app, expiration, and replay protections on the server before exchanging it for an app session.
- Do not trust an email address supplied by the browser, put a shared password in the client, or rely on hiding a launcher card for security.
- Keep launch tokens out of logs, analytics, and subsequent URLs. Use appropriate secure session cookies and protect state-changing requests.
- The stable app URL and Home Screen icon must work after an initial launch token expires. Provide a clear sign-in path, session expiry handling, and working logout.
- Enforce current app access and staff/admin roles on every protected server operation, including exports and photos. Revoking access must prevent continued access from an already signed-in device.
- App administrators can manage approved adults and make audited corrections. Do not grant staff global Differance Labs administration just to manage this app.
- If integration requires a protected configuration change, finish a clearly separated fictional-data demo while preparing the exact integration steps. Never introduce a production authentication bypass.

5. Students, classes, and dated sessions

- Students: name, primary parent/guardian name and phone, emergency contact, optional concise allergy/safety note, and approved pickup adults.
- Pickup adults: name, relationship, phone where available, approval status, and optional reference photo. Support one adult being linked to siblings.
- Emergency-contact status alone does not authorize pickup.
- Classes: name, instructor, and enrolled students.
- Support dated class sessions and creating the next session from an existing roster. Recurring-schedule automation can wait.
- Use stable IDs, not names, as identifiers. Preserve historical session records when names, enrollment, or approval lists change.
- Display current pickup permission during release while retaining the adult and authorization details recorded for past releases.
- Keep attendance and payment history when a student is archived or removed from future enrollment.

6. Drop-off and pickup workflow

1. Staff sign in, select today's class, and see its roster.
2. Each student row/card shows their name, attendance status, clearly labeled Paid checkbox, and attendance action. Include search, counts for Expected/Present/Released, and a separate Absent status.
3. Staff tap “Check in” when the child is physically handed to staff. Record the time and staff identity.
4. Staff tap “Pick up” to view that child's currently approved adults.
5. Staff select the adult and choose “Known to staff” or “Photo ID checked.” Show the optional reference photo, if present. Do not collect or store an image of the adult's ID.
6. Staff tap “Confirm release” at the physical handoff. Save the adult, verification method, actual release time, and staff identity, then return to the roster.

Handle early pickup, siblings, and parents without phones. Require a separate release confirmation for each child. Keep children Present until an actual release is recorded; never automatically release them at class end or midnight.

Do not permit release of a child who is not Present, duplicate release, or release to an adult whose permission has been revoked.

For an unapproved adult, show the parent's stored contact details. An admin may update pickup permission after verifying authorization through the parent's contact information already on file. Record who changed it, when, and a confirmation note.

Admins may correct mistaken attendance with a required reason and preserved audit history. Keep original events; do not silently overwrite handoff records.

7. Paid checkbox and payment history

- Put a simple Paid checkbox on each student's dated session roster entry.
- Staff check it after independently confirming payment in Square, Venmo, or another method.
- Payment confirmation is per student, per dated class session. It is not a permanent student-level flag.
- Default to unchecked. Label unchecked status “Not confirmed”; it is not proof of an outstanding debt.
- Allow confirmation before, during, or after class, including for absent students.
- Payment status never prevents recording drop-off or pickup.
- Record the confirming staff member and confirmation time automatically.
- Offer optional method (Square, Venmo, Cash, Other), amount, actual payment date, and reference/note. Do not require these fields just to check Paid.
- Store no card, bank, or payment-account credentials.
- Keep an audit history containing previous/new values, staff identity, and time. Require a reason to clear confirmation or correct payment details.
- Clearing Paid does not issue or imply a refund.
- Show confirmation details in student/session history. Include Paid/Not confirmed filters and payment fields in CSV exports.
- A newly created or copied session starts unconfirmed. Do not carry payment status into another session or lose its history when enrollment/attendance changes.
- Keep payment controls visually separate from check-in/release actions.
- Confirm saves on the server. Detect concurrent edits and resolve them explicitly instead of silently overwriting another staff member's change.

8. Printable paper backup

Provide an obvious “Print backup” action before class starts.

- Produce a readable US Letter layout printable or savable as PDF.
- Include business name, class, date, instructor, print timestamp, and “Staff use only.”
- Include student rows with generous blank spaces for actual arrival, departure, pickup adult, and staff initials.
- Show the saved Paid status as of printing, plus handwriting space for subsequent payment-confirmation initials/notes.
- Include a separate staff-only reference sheet with approved pickup names and essential contact information. Do not put this information on a parent-facing sign-in sheet.
- Support long names and multiple pages with repeated table headers and sensible page breaks.
- Make printing accessible on iPad/iPhone. If standalone Home Screen mode needs a Safari fallback, implement and explain that fallback.
- Provide “Enter paper attendance” to record actual event times afterward, pickup adult, and source “Paper.”
- Preserve the actual event time separately from the later entry time and entering staff member.
- Reconcile against existing digital records and prevent duplicates. Flag conflicting entries for an audited admin correction.
- Preserve historical paper pickup details if an adult's current authorization has changed; do not treat entering a past event as authorizing a new release now.
- Support entering payment confirmation from paper, including the original confirmation time when known and the later recorded time/staff identity.
- A blank paper Paid box must never automatically clear a newer digital confirmation.
- Explain that staff should print before class, keep sheets under staff control, and reconcile them afterward.

9. History and record keeping

- Filter history by student, class, session/date, and payment status.
- Show check-in, release, pickup adult, verification method, staff identity, actual/recorded times, and payment details.
- Export useful attendance and payment CSVs with clear dates/timezones and proper escaping.
- Preserve original events and append correction records with actor, time, previous/new values, and reason.
- Avoid destructive delete actions for completed sessions in normal staff workflows.

10. Reliability and privacy

- Use authoritative server saves with clear saving, saved, and failed states.
- Make release operations atomic and safe against double taps or two devices acting simultaneously. Recheck attendance and pickup permission when committing the release.
- Reconcile uncertain/timed-out requests before retrying so retries cannot duplicate an event.
- Refresh or synchronize roster changes across devices and when returning to the app.
- Version one is online-first. On connectivity failure, explain that changes cannot be confirmed and direct staff to the printed backup.
- Do not silently queue handoffs or show an unsuccessful save as completed.
- Cache only the app shell if needed. Do not persistently service-worker-cache student records, private API responses, or photos. Clear private client state on logout.
- Protect all live student information behind authentication and server/database authorization, regardless of whether the website or repository is public.
- Keep secrets out of source control and browser bundles, and student details out of routine logs.
- Store optional photos privately and authorize their retrieval.
- Store timestamps consistently and display them in the business timezone, default America/Chicago, including daylight-saving changes.
- Document actual database backup and restore procedures and retention. A CSV report is useful but is not a complete database backup.
- Do not claim availability or security features that the selected hosting/database plan does not provide.

11. Demo and verification

Include an isolated demo with approximately 16 fictional students, siblings, an absent student, multiple approved adults, and mixed payment confirmations. Label demo mode clearly. Demo reset must never touch live data.

Verify the meaningful risks:

- Unauthorized users, direct API access, missing/revoked app grants, and staff/admin permissions.
- Expired or invalid launch tokens, repeat token use, logout, and reopening the stable Home Screen URL.
- Revoked pickup permission, release of a child who is not present, duplicate taps, and concurrent releases.
- Persistence after reload and shared records across two sessions/devices.
- Network failure and uncertain saves without false success or duplicate records.
- Paper reconciliation, actual versus recorded time, conflicting records, and audit-preserving corrections.
- Payment scoped to the correct student/session, new sessions unconfirmed, audited changes, concurrent edits, and payment never blocking handoffs.
- Timezones, long names, multipage printing, and phone/tablet layouts.
- Existing Differance Labs homepage, login, launcher, and other apps still functioning after integration.

Use focused automated tests and practical browser checks. Distinguish automated/mobile-emulation checks from physical iPhone/iPad testing. Do not claim a device was tested unless it actually was.

12. Apple account, Home Screen installation, and possible native app

The first version must be usable as a hosted PWA without buying an Apple Developer Program membership, owning a Mac, or submitting to the App Store. Keeping it as a PWA permanently is acceptable.

Provide exact, current Home Screen installation instructions for both iPhone and iPad. The basic path is: open the stable HTTPS app address in Safari, use Share (or More then Share, depending on layout), select Add..

**What for rest of prompt before proceeding**

to Home Screen, enable Open as Web App if shown, and tap Add. Then launch the icon and sign in if needed. Install separately on each device. Use Apple's "iPhone instructions" (https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios) and "iPad instructions" (https://support.apple.com/guide/ipad/bookmark-favorite-webpages-ipadc602b75b/ipados), checking for changes.

Also provide an OPTIONAL-IOS.md guide comparing realistic future options:

- Free native testing: an ordinary Apple Account with Xcode's Personal Team requires access to a Mac/Xcode. Apple's free provisioning expires after seven days, requiring rebuilding/reinstallation, and has a three-device limit per platform. Explain why this maintenance may be inconvenient for regular class use. Do not promise permanent free installation on arbitrary devices. See "Apple's account comparison" (https://developer.apple.com/help/account/basics/about-your-developer-account/).
- Paid Ad Hoc distribution: explain how a paid membership allows installation on registered devices without a public App Store listing, including device registration, signing/provisioning, installation, expiration, and renewal. Verify the current limits and exact process using "Apple's Ad Hoc documentation" (https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/).
- TestFlight: explain the paid developer-account requirement, build expiration after 90 days, and external beta review requirements. It is a beta distribution option, not a permanent deployment. See "Apple's TestFlight overview" (https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
- Apple's Developer Program currently lists a US price of $99 per year; verify current regional pricing before recommending a purchase. See "Apple enrollment" (https://developer.apple.com/programs/enroll/).

Clearly state which future native steps require a Mac or a suitable macOS build/signing service. My connected development computer is Windows; do not assume I own a Mac.

If an easy sideloading option is suitable, explain its real signing, renewal, account, and device restrictions. Do not make unsupported jailbreak, enterprise-certificate, or regional distribution workarounds part of the plan.

Keep the application structured for a possible native wrapper later, but do not build a native project or introduce that complexity now. Give an ordered native conversion/signing/install checklist, clearly labeling commands or configuration that cannot be finalized until a native project and developer setup exist.

13. Explicit testing and deployment instructions

Create TEST-AND-DEPLOY.md for a nontechnical owner working remotely from a phone. Use numbered steps with the exact page, button, command, directory, URL, and expected result wherever they can be determined.

Label each step by where it happens: “On your phone/iPad,” “On the connected Windows computer,” “In GitHub,” “In Vercel,” or “In Supabase.” Provide Windows-compatible commands, using npm.cmd/npx.cmd where appropriate. Do not tell me to open my phone's localhost to reach the remote computer.

Cover the complete sequence:

1. Open/select the existing differancelabs project in Codex and run the app's setup commands from its own folder.
2. Identify or create the isolated Vercel project from the correct GitHub repository and set its Root Directory, framework/build/output settings, and deployment branch behavior. Leave the main project's settings intact.
3. Configure a separate demo/preview environment. List exact variable names, whether each is public or server-only, where to obtain its value, and which environment receives it. Never print secret values.
4. Set up the test database and apply prepared test migrations. Explain any account login or approval I must personally complete.
5. Trigger the Git-based preview deployment, check its build result, and give me the actual HTTPS URL I can open from my phone. If this could not be completed, state the exact blocker and remaining steps.
6. Explain any Vercel preview access protection, separately from staff sign-in. Keep real data private.
7. Open the fictional-data demo, create/select a dated class, check in a student, confirm Paid, select an approved adult, and release the student.
8. Open on a second authorized device, verify saved changes, and test reload/reopen behavior.
9. Install the stable app URL on iPhone and iPad Home Screens and verify sign-in, return visits, portrait/landscape layout, and session expiry.
10. Print/save the backup, perform a fictional paper entry, reconcile it, and inspect attendance/payment history and CSV exports.
11. Test network interruption with fictional records and confirm that staff are directed to paper without a false saved state.
12. Prepare production database/configuration and staff access. Show the exact migrations and any required approval before applying production changes.
13. Configure art-checkin.differancelabs.com after any required DNS approval. Use the exact DNS values supplied by the verified hosting project; do not guess or change existing main-site records.
14. Deploy through the repository's approved Git workflow after review. Verify HTTPS, app access, database permissions, persistence, backups, and the physical handoff workflow before using real student records.
15. Explain how to add/revoke staff, install on another device, deploy updates, identify the running version, and recover from a failed release.
16. Provide an app-only rollback procedure that leaves the main site intact and preserves attendance/payment records. Explain database compatibility rather than assuming a frontend rollback undoes a migration.

Do everything possible with existing authorized tools and access. Do not hand me a long list of manual steps that you could have completed. For steps requiring my login, paid purchase, or a repository-mandated approval, prepare the exact action and explain why I must do it.

14. Deliverables and completion

Deliver:

- The working isolated app, migrations, focused tests, demo data, and environment example.
- REQUIREMENTS.md, README.md, TEST-AND-DEPLOY.md, OPTIONAL-IOS.md, and a brief STAFF-GUIDE.md.
- A concise explanation of code, deployment, authentication, and database separation from the main site.
- A list of every changed file outside the app folder and why it was necessary.
- The actual preview URL and final URL if deployed; clearly label anything only proposed.
- What was tested, what passed, and any physical-device checks or account setup still outstanding.
- The actual expected ongoing costs, including whether existing paid services already cover them.
- Any specific final approval needed, with the concrete prepared changes.

If credentials or infrastructure access are unavailable, still finish the runnable fictional-data demo, implementation, migrations, tests, and precise setup guide. Clearly distinguish a demo from a production-ready system; do not claim live readiness until persistence, authorization, and the release workflow have been verified.

Begin by inspecting the selected Differance Labs project, choose reasonable defaults consistent with these requirements, and carry the implementation through as far as the available access allows.
