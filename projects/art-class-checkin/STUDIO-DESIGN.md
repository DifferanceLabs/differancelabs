# Art School Desk — product design

Design date: September 5, 2026 (America/Chicago). Working product name; the business name remains editable.

**Status: proposed expansion, with an interactive fictional concept.** The existing Art Class Check-In proof of concept remains at https://art-class-checkin-poc.vercel.app. This design does not activate registration, payments, email, social publishing, tax filing, or new production storage. The concept's actions run only in memory and reset when reopened. All names, amounts, messages and photos represented in it are fictional.

Open the design directly in a phone or tablet browser at **https://art-class-checkin-poc.vercel.app/studio-design**. Choose **Manage studio** or **Run class**. The regular page provides the same sample workflows without requiring the conversation's visualization display. It is generated only when building with ART_APP_MODE=demo; live builds omit it. Its script and styles are separate local files so the app's existing Content Security Policy stays intact. Decorative conversation icons and the host's design-tweak controls are omitted on this page.

## 1. The owner's operating model

Open the app and answer three questions: **What happens next? Who needs attention? What needs my decision?** The same records support teaching, customer service, enrollment and bookkeeping. Staff should not copy a roster into a marketing tool, reconcile a sibling by name, or hunt through a personal text thread to determine pickup permission.

The main record is a **family**, containing linked students and adults. Adults have separate contact, billing, emergency and pickup relationships; one relationship never silently implies another. Families may have multiple households and restricted contacts. A sibling connection must not reveal information to an adult who lacks permission for that child.

Start with one location, a small staff and elementary classes. Support terms, camps, workshops and private parties using the same scheduling and enrollment model. Add locations or complex memberships only when the school needs them.

## 2. Two workspaces, one set of records

| Workspace | Primary navigation | Opening screen | Intended user |
| --- | --- | --- | --- |
| Run class | Today · Roster · Messages · Tasks | Assigned class, prep checklist, current headcount | Junior assistant, instructor |
| Manage studio | Today · Schedule · Families · Money · Growth | Today's sessions and a short queue of decisions | Owner, permitted manager |

Inbox and Studio are secondary owner destinations. Studio contains team access, lesson library, supplies, integrations, documents and settings. History belongs to its student, class or financial record; a global history/export view remains available in Studio. Mobile primary navigation has four or five labeled targets; secondary destinations never crowd the class roster.

An owner can enter Run class. An assistant cannot reveal management controls by changing a mode switch or URL. The concept offers a role switch for exploration; the real product must authorize every operation on the server. Existing Differance Labs app grants remain the entry gate, with app-local permissions layered beneath them.

### Run class

- **Today:** upcoming assigned sessions, room, teaching plan, supplies and Print backup. Open class puts the roster one tap away. The app does not start attendance automatically.
- **Roster:** large student names; Expected, Present, Released and Absent counts; search; Check in and Pick up. Payment is visually separate. Essential safety notes are visible to assigned staff, with private details on demand.
- **Messages:** conversations about assigned classes, approved replies, contact parent and ask owner. Pickup-change requests become an owner task; a message is not pickup authorization.
- **Tasks:** prepare materials, confirm paper backup, clean up, enter paper events and report an incident. Finish class cannot clear children still Present. Unresolved handoffs stay prominent.

### Manage studio

| Area | Everyday work | Main action |
| --- | --- | --- |
| Today | Next sessions, uncovered shift, bounced reminder, waitlist opening, approvals | Resolve the next item |
| Schedule | Courses, dated sessions, rooms, instructors, capacity, closures, camps, parties | Create from a template |
| Families | Students, households, approved adults, forms, conversation, enrollment and history | Open family |
| Money | Invoices, payments, credits, refunds, expenses, payouts and reconciliation | Review exceptions |
| Growth | Public classes, invites, newsletters, blog, galleries, social drafts and referrals | Prepare a campaign |
| Inbox | Parent inquiries and replies, assigned owner, follow-up deadline | Reply or assign |
| Studio | Staff, lessons, supplies, documents, integrations and audit history | Find a setting or recurring task |

Navigation uses ordinary verbs: Open class, Invite next family, Request form, Prepare update, Review refund. Each screen has one primary next action. Secondary details open within the record and preserve the return path.

## 3. Seven complete workflows

### A. Fill and run a six-week course

1. Owner chooses **Schedule → New course → After-school template**. Enter dates, age/grade range, room, instructor, capacity, price and cancellation policy. Templates fill teaching plans and materials.
2. The app checks instructor and room conflicts, holidays, capacity and missing details. Recurrence expands into individually editable dated sessions; changes show the affected dates before publication.
3. **Review & publish** creates a public enrollment page, invitation draft and preparation tasks. The class exists in one place; the website, reminders and roster use that record.
4. A parent opens the link in an ordinary phone browser, selects students, enters adult contacts, completes forms and pays through Square. No app installation or parent password is required.
5. An atomic seat hold and verified payment result create the enrollment. A confirmation email contains dates, location, what to bring and a calendar attachment. The roster and prep quantities update.
6. The assistant prints the backup, teaches, records each physical handoff and completes the closing checklist. The owner sees exceptions, not a stream of routine taps.

**Exceptions:** an expired hold cannot overbook a full course. A late payment, duplicate webhook, sibling partial enrollment or abandoned checkout goes to a clear reconciliation state. A browser return from checkout is never proof of payment. Reusing a course template never copies previous attendance or Paid flags.

### B. Admit a waitlisted student

**Invite next family** prepares one time-limited offer for the number of available seats. The owner reviews the recipient and expiry. A declined or expired offer advances the queue according to the school's policy; it does not promise the same last seat to multiple families. Siblings can request staying together. Scholarship and staff-held places count against capacity explicitly.

### C. Check in and release a child

Preserve the existing audited workflow: Check in at handoff → Present → choose a currently approved adult → Known to staff or Photo ID checked → Confirm release at handoff. Keep a separate confirmation for each sibling. Payment or an incomplete marketing form never blocks recording an actual handoff. Unapproved adult requests show the contact already on file and require the existing admin verification process. Network uncertainty keeps the action unconfirmed and directs staff to paper.

### D. Turn one class into a parent update and marketing draft

1. Staff choose **Class → Add photos** and upload artwork or class photos. Uploads start private; show individual progress and retry only failed files.
2. Staff manually identify every pictured child. Unknown people, uncertain permissions or visible private information block public use. No face recognition is needed.
3. **Prepare class update** assembles a short lesson summary and the appropriate photos for each family. Parents get only their authorized child's private gallery through a scoped, expiring browser session.
4. **Create marketing draft** uses only specifically eligible media. One source produces a blog draft, newsletter, class invitation and channel-specific social captions. Each has a preview, audience and publish time.
5. The owner approves each destination. Publication records the exact media and consent versions used. Withdrawing permission stops pending posts and creates removal tasks for published copies; the app cannot retrieve screenshots or guarantee erasure from social networks.

Consent is separate for staff reference, private family sharing, website publication and social marketing. Artwork may itself contain a child's name; it still needs review. Adult pickup reference photos are never eligible for marketing. Strip location/EXIF metadata from publication copies. Public posts omit children's full names and live whereabouts by default.

### E. Handle a cancellation or weather closure

**Cancel session** shows the date, enrolled families, staffing tasks, scheduled reminders and the applicable credit/refund options. The owner confirms the change and notification preview. The app cancels stale reminders and records each channel's delivery result. Families can acknowledge the change; undelivered or unacknowledged urgent notices become call tasks. Refunds require a separate reviewed financial action. Historic attendance remains intact.

### F. Welcome a family and manage replies

An inquiry, event RSVP or registration creates a lead/contact with its source and communication preferences. A shared inbox keeps the thread with the family, assigns one staff member and offers approved replies. Leads progress through Inquiry → Invited → Registered → Returning; consent is not inferred from that progression. A former family can receive a re-enrollment invitation only under its current marketing preferences.

A parent receives browser links for enrollment, payment, a requested form or a private gallery. Sensitive record access requires verification of the adult/contact already on file. Treat links as bearer credentials until exchanged for limited sessions; hash stored tokens, expire/revoke them, omit them from logs, and require stronger verification for sensitive changes. Unverified inbound email may create a request, never change a guardian, bank detail or pickup grant. Social messages remain in their native inbox unless an authorized API integration actually supports them.

### G. Close the month and prepare for the accountant

**Money → Close month** walks through unallocated payments, missing receipts, fees, refunds, credits, deposits and unmatched payouts. One accountant package contains separate sales, payments, refunds, expenses, liabilities and reconciliation files, with receipt references and a manifest. It records the reporting basis and date range. The owner reviews suggested expense categories and locks a completed period; later adjustments remain visible.

Income, sales tax collected, fees, refunds and net bank deposits stay separate. A $180 tuition payment with a $5.52 processing fee produces $174.48 net in a hypothetical example; the fee is not a second discount to tuition. That example is not a quote for the owner's actual Square rate. Manual Paid checkboxes alone cannot establish booked revenue.

The tax area organizes records, accountant-approved categories, a configurable reserve target and owner-entered deadlines. It does not select the school's tax jurisdiction, decide deductibility, file returns or label a reserve estimate as tax owed. Merchandise, tuition, camps and parties can have different configured tax treatments. An accountant must confirm applicability, reporting basis and retention before real use. IRS guidance emphasizes supporting income/expense records and retention appropriate to the record. [IRS recordkeeping](https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping)

## 4. Payments that fit the existing business

Use **Square first**, since it is already part of the owner's workflow. Square can host mobile checkout and provide order/payment notifications; the app supplies the course, student allocation and enrollment logic. [Square Checkout API](https://developer.squareup.com/docs/checkout-api)

Use invoices for balances or a party deposit, with Square managing its payment page and configured reminders. Some installment features require Invoices Plus; the Invoices API does not create recurring invoices. Consider its separate Subscriptions API only when membership rules are understood. Avoid two systems sending the same payment reminder. [Square Invoices API](https://developer.squareup.com/docs/invoices-api/overview)

Maintain distinct records for an order, payment, refund, credit, provider fee, payout and allocation to a student/course. A single parent payment can cover siblings; allocation never duplicates the amount. Partial payments remain partial. Pending, disputed and refunded payments are distinct from settled payments. A manual Venmo/cash confirmation remains supported, with reference and reconciliation; do not scrape a personal Venmo account or claim it synchronizes automatically.

Keep today's **Paid / Not confirmed** workflow for manual confirmations. When integration arrives, show **Paid · Square** or **Payment confirmed · Manual** with its source. Provider events are append-only; staff cannot edit Square settlement by toggling a checkbox. Correct allocation through an audited financial adjustment. A newly created session begins unconfirmed; a paid course can cover it only through an explicit, traceable allocation policy, not a copied boolean. Preserve the original manual confirmation history during migration.

Owner-only refunds show the student, order, amount, reason and remaining refundable balance before submission. A cancellation does not imply a refund, a cleared checkbox does not issue one, and a provider timeout remains Pending until reconciled.

## 5. A small integration set

These are proposed connections, not accounts connected during this design task. Use one provider per function initially and hide vendor terminology from ordinary staff screens.

| Need | Preferred starting point | What stays inside Art School Desk | Boundary / fallback |
| --- | --- | --- | --- |
| Checkout and invoices | Existing Square account | Course prices, family/student allocation, exceptions | Square hosts card entry; manual Venmo/cash confirmation remains |
| Email, invites, newsletters, replies | Resend | Templates, audiences, shared thread, task ownership | Verified sending domain; receive replies on a dedicated address; preserve the current mailbox |
| Student records and private media | Existing app's Supabase architecture | Permissions, consent, galleries, audit and retention | Private originals; public derivatives only after approval; independently backed up |
| Calendar | Downloadable calendar events first; optional Google Calendar integration | Classes and sessions are authoritative | No student/medical data in calendar titles; do not assume instant calendar-feed refresh |
| Social publishing | Buffer for supported connected channels | Draft, review and channel-specific result | Owner connects accounts; unsupported formats use a ready-to-post package and native app |
| Accounting | Accountant-reviewed exports first | Operational ledger, receipts and reconciliation | Connect the owner's chosen accounting system later; never double-post Square sales |
| SMS | Optional Twilio when email is insufficient | Consent, templates, delivery status and replies | Number, registration and usage costs; urgent failed delivery becomes a phone-call task |

Resend supports inbound webhooks and message retrieval, allowing a shared inbox to be built. A dedicated receiving subdomain avoids replacing an existing mailbox's MX records. Its Broadcast API supports audience segments and marketing drafts; transaction messages and marketing subscriptions remain distinct. [Receiving email](https://resend.com/docs/knowledge-base/how-can-i-receive-emails-with-resend), [Broadcasts](https://resend.com/docs/dashboard/broadcasts/introduction)

Buffer's current API supports creating/scheduling posts and reporting success or error per channel. Confirm account type, formats and permissions when connecting; an available publishing API does not imply access to all social DMs or metrics. Owner-only API use must follow the provider's plan terms; do not use it to circumvent team-seat restrictions. [Buffer publishing](https://developers.buffer.com/guides/posts-and-scheduling.html)

Google Calendar exposes events and calendars through its API. Begin with calendar attachments; add a separate, narrowly scoped connection later rather than altering Differance Labs Google sign-in. [Google Calendar overview](https://developers.google.com/workspace/calendar/api/guides/overview)

Private media should continue through the app's authenticated, no-store endpoint, rechecking current access. Supabase signed object URLs are bearer URLs that can outlive changes to authentication keys; do not treat them as immediately revocable staff sessions. [Supabase private downloads](https://supabase.com/docs/guides/storage/serving/downloads)

For US app-sent SMS over a local 10-digit number, Twilio requires A2P 10DLC registration, including individuals and hobbyists. Optional SMS must honor opt-in, opt-out and delivery failures; it is not required to run class. [Twilio registration](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)

### Cost decisions

The existing fictional Vercel Hobby/Supabase Free POC remains as configured. This design adds **no subscriptions or processing charges**. It does not establish eligibility or live readiness for a later commercial school deployment; those remain covered by the existing deployment guide.

Published examples checked September 5, 2026: Resend's transactional Free tier lists 3,000 emails/month and 100/day; Pro lists $20/month for 50,000. Marketing is priced separately. A busy registration/reminder day must not silently exhaust a free daily cap. [Resend pricing](https://resend.com/pricing)

Buffer lists Free with three channels, ten queued posts per channel, one user and 3,000 API requests/month. Its displayed annual Essentials rate is $5 per channel/month, billed yearly. Choose only after verifying the required account capabilities. [Buffer pricing](https://buffer.com/pricing)

Square fees depend on plan and payment route; its page distinguishes invoice/online and Online API rates. Read the existing account's actual rate before forecasting margins. No additional processor is necessary for this design. [Square fees](https://squareup.com/us/en/payments/our-fees)

Actual live cost will also depend on photo volume, backups, hosting eligibility, email bursts, optional SMS and the chosen accounting package. Avoid buying all modules at once. Integration settings should show usage, last successful sync, a spending threshold and an owner-visible failure queue. No automatic paid upgrade.

## 6. Automation with visible outcomes

| Trigger | Routine work after owner enables the rule | Stop / review condition |
| --- | --- | --- |
| Verified enrollment | Create roster entries, confirmation and prep counts | Capacity mismatch, duplicate family, payment exception |
| 24 hours before a session | Send approved logistics reminder once | Cancellation, stale date, opted-out channel or delivery failure |
| Seat opens | Prepare a waitlist offer | Owner approves recipients and expiry |
| Form missing | Request the specific form with a scoped link | Bounced contact or missing authority |
| Class is completed | Prepare family recap and re-enrollment draft | Remaining Present children; media consent unresolved |
| Eligible invoice due | Use its designated provider's reminder schedule | Paid, disputed, credit pending or opted-out channel |
| Supply below minimum | Create a shopping-list task | Purchase still requires owner action |
| Month ends | Prepare reconciliation and accountant package | Unmatched records prevent a final closed status |

Show Draft, Scheduled, Sending, Delivered, Failed and Needs review accurately. Accepted by an email service is not delivery; email delivery is not proof of reading. A disconnected integration creates a task with a supported retry. Recheck audience, consent, session version and cancellation immediately before sending. Use deduplication keys and a durable outbox so retries cannot send duplicate bills or reminders. Do not make real-time messaging depend on a once-daily scheduler.

One click should complete a prepared routine step. Financial refunds, public publishing, changed pickup permissions and a child's physical release retain a short contextual review. Assistance can draft a caption, summarize an approved lesson or suggest an expense category; it cannot invent consent, release a child, issue a refund or publish without the required human decision.

## 7. Permissions and privacy

| Capability | Junior assistant | Instructor / lead | Owner / permitted manager | Bookkeeper |
| --- | --- | --- | --- | --- |
| Assigned rosters, essential contacts, handoffs | Yes | Yes | Yes | No |
| Record manual payment confirmation | If delegated; reason to correct | If delegated | Yes | Financial records only |
| Lesson notes and private photo upload | Assigned classes | Assigned classes | Yes | No |
| Approved operational replies | Assigned classes | Assigned classes | Yes | Billing scope only |
| Change pickup authorization / audited attendance correction | Request owner | Only with explicit admin permission | Yes | No |
| Prices, refunds, enrollment policy | No | No by default | Yes | Read/export; refunds only if delegated |
| Marketing send / public media approval | Draft only if delegated | Draft only if delegated | Yes | No |
| Staff roles, connections and access revocation | No | No | Owner only | No |
| Expenses and accountant export | No | Own receipts only | Yes | Yes, without child safety notes |

Do not make a class instructor a global Differance Labs administrator. Store role grants separately from the class assignment. Revoke access on the next protected operation, including exports and photos. Exports contain only fields appropriate to their purpose; no allergy notes in accounting or marketing systems. Shared iPads need individual staff identity, a visible current user and an easy lock/sign-out action.

Keep public registration/blog routes separate from authenticated staff APIs. Public forms accept new submissions without exposing the family's existing record. Add rate limits, bot protection, input validation, verified webhooks, sanitized inbound email and attachment scanning. No private student records, messages or photos in analytics, URL query strings, service-worker caches or routine logs.

## 8. Data and implementation boundaries

Keep the TypeScript PWA in projects/art-class-checkin with its own build and Vercel deployment. Add product modules inside that app. Retain the existing auth adapter, atomic attendance operations, paper reconciliation and audited payment history. Preserve the main Differance Labs website and OAuth flow.

Proposed additive entities:

- Families, household contacts, child/adult relationships and separately scoped consent versions.
- Course templates, course offerings, dated sessions, rooms, staff assignments, enrollment, seat holds and waitlist offers.
- Orders, payment events, allocations, refunds, credits, expenses, receipts, provider fees and payout reconciliation.
- Conversations, messages, delivery attempts, contact preferences and follow-up tasks.
- Media assets, depicted-student links, usage approvals, gallery access and publication copies.
- Content drafts, destination publications, audience snapshots, referrals and campaign attribution.
- Lesson plans, material quantities, supply thresholds, operational tasks and incident records.
- Integration connections, external-ID mappings, webhook receipts, durable jobs and audit events.

Use stable IDs and version checks. A single person may have several relationships; name matching is not identity. Payments, attendance, consent and publishing approvals retain their original events plus corrections. Integration secrets are server-only; adapters make providers replaceable. Keep schema changes additive and prepare migrations for approval before applying anything to production.

Backups must cover relational records **and private storage objects**, with encrypted copies and tested restore. CSV exports are reports, not a full backup. Photo retention and accounting retention are separate policies; deletion of a photo must not erase an attendance event. Growth experiments run with synthetic contacts or an explicit test-recipient allowlist and payment sandboxes.

## 9. The junior assistant's first hour

| Time | Practice in training mode | Observable pass condition |
| --- | --- | --- |
| 0–10 minutes | Sign in, find the assigned class, read safety notes, print backup | Correct class/date and current staff identity |
| 10–25 minutes | Check in three fictional students; try a mistaken tap | Understand Present and how to request a correction |
| 25–40 minutes | Release siblings separately; encounter an unapproved adult | Verify adult, physical handoff, contact on file, escalate correctly |
| 40–50 minutes | Use an approved reply, add a private class photo, complete a prep task | Nothing published; no permission changed |
| 50–60 minutes | Simulate lost connectivity, enter a paper event, finish shift | No false saved state; Present child still visible; owner gets exceptions |

Provide a one-page desk card, a repeatable training mode with fictional data and short help on the exact screen. The one-hour goal is an acceptance test, not a claim that a real assistant has completed training. Target ordinary check-in in one tap, pickup in three deliberate decisions, and finding a family or next task within two navigational steps. Test with a new person before declaring that target met.

## 10. Build order and acceptance gates

1. **Studio foundation:** family profiles, schedule/templates, role-specific workspaces, staff tasks, lesson/material lists. Keep the proven check-in behavior. Gate: assistant can run a class using the training checklist; old attendance and payment history remain intact.
2. **Enrollment and money:** public mobile enrollment, forms, capacity holds, Square sandbox, invoices, allocations and refunds. Gate: two buyers cannot take the last seat; delayed/duplicate events reconcile; a parent completes the flow without an app.
3. **Communication and photos:** real shared email inbox, class reminders, private galleries, consent and delivery exceptions. Gate: a forwarded/revoked gallery link cannot expose another family; opt-outs apply before send; no duplicated reminder after a retry.
4. **Growth:** blog, invites, newsletters, referrals and approved social distribution. Gate: revoked/unknown consent blocks publishing; each destination has an independent success/failure record; limited API access has a working manual fallback.
5. **Owner operations:** accountant package, expenses, supply thresholds, optional SMS and selected accounting/calendar sync. Gate: payment-to-payout totals reconcile; duplicate imports do not duplicate sales; owner can restore a tested backup.

Build and verify each complete workflow before adding the next provider. The existing fictional POC remains usable while these modules are designed. Native iOS, custom payroll, automatic tax filing, ad buying, parent social accounts and a second payment processor are outside this initial expansion.

## Design delivery

- Interactive in-conversation concept: owner Today, schedule, family profile, money, growth, inbox and Studio; assistant Today, roster, pickup, messages and tasks; browser-only parent enrollment preview.
- All prototype actions are clearly fictional and local; no credentials, API requests, payments, notifications or database writes.
- Design exploration includes a compact/comfortable spacing choice and two accent options through the conversation's design controls.
- Existing check-in workflows, the database and production access rules are unchanged by the concept.

Design verification: exercised owner navigation, operator check-in and guarded release, long student names, the remaining-Present warning, campaign review, parent registration preview and editable course review in Chromium desktop and WebKit phone/tablet emulation. Checked visible buttons at a minimum 44px height and horizontal bounds, including a 320px content width. Inspected desktop, phone and tablet screenshots. No script errors in those checks. Physical-device testing and a first-hour session with a real new assistant remain outstanding; this does not validate any proposed live integration.

The direct browser page was also checked in Chromium desktop and WebKit phone/tablet emulation with the existing strict security headers. Navigation, sample check-in/release and parent registration work without the conversation runtime, API calls or server writes. Both build modes pass TypeScript and Vite checks; live builds omit the design directory.
