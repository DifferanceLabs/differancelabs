# Run one class as staff and manager

Open this address on your phone or iPad:

https://art-class-checkin-poc.vercel.app/studio-design

This is an implemented, fictional class-day simulation. It needs no Vercel or Google login. The separate cloud-backed check-in POC remains at https://art-class-checkin-poc.vercel.app.

The **Run class** and **Manage studio** buttons share the same practice records in one tab. Reload preserves those records using session storage; a different device or a newly opened independent tab starts its own exercise. Closing the tab may discard the exercise. **Reset practice → Reset fictional practice** clears only this simulation. Use fictional details only. No real payment, email, social post, phone call, photo upload or database write occurs.

## A complete practice run

1. **On your phone/iPad:** open the address above. Tap **Reset practice → Reset fictional practice** if you want a clean start. You begin with 16 fictional students in **After-School Art Studio**, September 8, 2026, and mixed payment confirmations. The Chicago practice clock advances as actions occur.
2. **As staff:** tap **Run class**. Open **Print backup → Print / Save PDF** to use the browser's print dialog. The roster includes saved Paid status and blank handwriting spaces. A separate staff reference sheet contains fictional contacts and approved adults. On iPhone/iPad, if your browser does not expose printing, open the same address in Safari and use Share → Print. Keep the practice exercise in the same tab when possible.
3. Tap **Back to class**. Check all three preparation tasks: collage kits, safety notes and paper backup. **Open lesson & safety notes** shows the teaching sequence and the fictional safety/consent notes. Tap **Start arrivals**. It is blocked until preparation is complete.
4. On the roster, mark **Owen Patel → Absent**. Check in the other students as if each had physically arrived. For the paper exercise below, leave **Lucas Adams** Expected. Status counts change immediately. Search and the attendance filter work with long names.
5. Independently pretend to confirm Noah's payment, then tap **Paid** on Noah's row. **Payment details** shows the actor/time and optional method, amount and note. Clearing Paid opens a reason-required form; it does not clear the saved record until that form is saved. Payment never prevents a check-in or pickup.
6. Practice an exception: **Amelia Brooks → Pick up → Adult is not on the approved list**. Include **Ezra Brooks** in the request. Enter **Avery Brooks**, relationship **Aunt**, and a fictional request note. Tap **Send to manager for review**. The children stay Present and Avery is not yet approved.
7. **As manager:** tap **Manage studio → Open reviews → Review request**. Read the parent-on-file details, enter the fictional verification/decision reason, check the stored-contact verification box and tap **Approve request**. This makes Avery available for the selected siblings in this dated session. Staff cannot approve their own request.
8. **As staff:** return to **Run class → Open roster**. Tap **Amelia → Pick up**, choose **Avery Brooks · Aunt**, select **Known to staff** or **Photo ID checked**, then **Confirm release**. Ezra stays Present until you repeat the individual release for Ezra. Early pickup works before the general pickup phase. A revoked adult disappears from future release choices; historic releases retain the recorded adult.
9. Tap **Begin lesson**, then **Begin pickup**. These controls advance the phase/clock; they never release children automatically. For Lucas's paper exercise, choose **Enter paper attendance**, select Lucas, enter actual arrival **15:32**, departure **16:15**, adult **Casey Adams**, verification and a fictional staff note. Check paper payment confirmation and enter **15:20** if desired. **Reconcile paper record** adds the actual times and later entry details to history.
10. To test a conflict, enter Lucas's paper again with departure **16:12** and a note explaining the discrepancy. Leave its Paid box blank. It goes to **Manage studio → Reviews**. Approving the reasoned correction preserves original events and keeps the newer digital Paid confirmation. The entry records a past event; it does not grant a new adult pickup permission.
11. Release every remaining Present child, individually. Use **Tasks** to add sample artwork, flag glue for restocking, report a fictional incident if desired, clean up, check supplies and confirm paper reconciliation. Resolve any manager requests. **Submit class for manager review** lists any blockers: Present/Expected children, incomplete closing tasks or unresolved reviews. Payment and private artwork do not block closing.
12. When the roster reads **15 Released, 1 Absent**, enter a staff handoff note and submit. **As manager**, open **Review & close class**, review the summary, enter a sign-off note and tap **Close class**. **Class complete** shows the finished session; its records remain available after reload. Creating the next session copies enrollment only, with every student Expected and every Paid box unchecked.

## Other working manager and staff actions

- **Corrections:** student **Details → Request attendance correction** creates a review. Manager approval keeps original check-in/release events and appends the correction. A request based on an older attendance version must be declined and submitted again against current records.
- **Incidents:** **Tasks → Report an incident** records the student, event and immediate action for manager review. A required review cannot silently disappear at close.
- **Artwork:** **Tasks → Add sample artwork** adds a built-in illustration to a private sample library. No file from your device is uploaded. Under **Growth**, managers review public permission. Samples representing the Brooks siblings must stay private; artwork-only samples can be approved.
- **Messages:** staff can reply to the fictional apron question using the class template. Managers can prepare a family recap with the actual practice counts and a public post after an eligible sample is approved. **Record simulated send** creates an outbox entry; repeating the same class message is rejected. Nothing is sent to a person or service.
- **Money:** simulate a matched Square payment for one unconfirmed student/session; record a fictional expense; review confirmation amounts. “Amounts recorded” omits confirmations whose optional amount is blank and is not an accounting balance.
- **History/CSV:** open class or student history for original and corrected values, reasons, actual time, recorded time and actor. Attendance/payment CSVs contain both sets of fields; audit CSV includes previous/new values. CSV dates identify the session and Chicago timezone; instants are labeled UTC. These are fictional reports, not complete backups.
- **Reopen:** a manager can reopen a Submitted/Closed class with a reason. The audit remains intact; paper reconciliation and sign-off must be completed again.

## Reproduce and verify on Windows

Run these in PowerShell on the connected Windows computer:

    Set-Location C:\Users\BDM\Documents\GitHub\differancelabs\projects\art-class-checkin
    npm.cmd ci
    npm.cmd run check
    npx.cmd vitest run tests/simulation.test.ts
    npx.cmd playwright install chromium webkit
    npm.cmd run test:simulation:browser

The browser suite builds a local static simulation and runs the entire staff/manager class, manager exceptions, print layout, phone search, reload, exports and new-session reset in WebKit phone/iPad portrait and Chromium tablet landscape. It checks that the simulation makes no app API requests. These are automated browser/mobile-emulation checks, not physical iPhone/iPad testing.

For local manual practice:

    node scripts/serve-simulation.mjs

On the Windows computer, open http://127.0.0.1:5176/studio-design. Your phone cannot reach that computer's localhost; use the hosted HTTPS address above. Stop the local process with Ctrl+C.

To test the hosted page with the same browser walkthrough:

    $env:ART_SIMULATION_URL='https://art-class-checkin-poc.vercel.app'
    npm.cmd run test:simulation:browser
    Remove-Item Env:ART_SIMULATION_URL

## Separation and deployment

The TypeScript simulation is under **design/simulation/** in the isolated art app. It shares only the existing Chicago-time conversion helper and the demo build output. It has no credentials, authentication exchange, API client, service worker or cloud persistence. Its session-storage key is separate from the actual check-in POC.

The existing Vercel project **art-class-checkin-poc**, Root Directory **projects/art-class-checkin**, publishes it only with **ART_APP_MODE=demo**. A normal app build empties dist, and live builds omit the simulation. Deployment remains a Git push of **feat/art-class-checkin** to the authorized isolated preview. No DNS, Google OAuth, main-site source, database structure or Vercel project settings change is needed.

The only change outside the app folder for this simulation is **.github/workflows/art-class-checkin.yml**, adding the end-to-end simulation browser suite to the existing checks. The main site's local Vercel link stays intact.

Use the app project's Vercel deployment history to select a previous successful Git deployment for app-only rollback, or revert the simulation commit on the feature branch and push. Simulation state is disposable; use Reset practice after a schema change. Cloud check-in records are unaffected. The broader studio's real integrations and production deployment remain future work described in STUDIO-DESIGN.md and TEST-AND-DEPLOY.md.
