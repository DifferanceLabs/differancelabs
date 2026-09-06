# Hobby proof of concept

The owner explicitly requested Vercel Hobby for a proof of concept. This deployment uses fictional records only and does not activate the live Differance Labs launcher.

## Isolated hosting

- Vercel team: `differance-labs-projects`, existing Hobby plan; no upgrade or trial.
- Separate project: `art-class-checkin-poc` (`prj_clc9hoYqMtTnhr6ytl7EQhwQPb4A`).
- Git repository: `DifferanceLabs/differancelabs`.
- Root Directory: `projects/art-class-checkin`; Vite, Node 24, `npm ci`, `npm run build`, output `dist`.
- Preview branch: `feat/art-class-checkin`. Pushes use the existing GitHub integration.
- Vercel-provided address: `https://art-class-checkin-poc.vercel.app`, assigned to this preview branch. Verification of the first deployment is pending.
- Runtime settings are Sensitive variables scoped only to this branch's Preview environment. No Production variables are configured.
- Vercel Authentication is off for this fictional demonstration so the owner can open it on a phone without a second hosting login. Anyone with its address can enter a fictional demo role; this is not production staff authentication.
- Cloud database: separate `art-class-checkin-demo` Supabase project (`lvfyzarxputeafslrjwe`). The server verifies its UUID and demo mode before permitting access.

The existing main Vercel project, local root `.vercel` link, live database, Google OAuth settings and Differance Labs DNS are unchanged. `https://art-checkin.differancelabs.com` remains a proposed future address.

## Testing boundaries

Use **Enter demo as staff** for check-in, payment and release. Use **Enter demo as app administrator** for student/class setup, approved adults and audited corrections. Enter fictional names, phone numbers and photos only. The two roles are demonstrations, not proof that the live Google/launcher integration has been activated.

The demo stores changes in its cloud database, so changes are shared across devices and survive a reload. It is online-first; use the printed backup during a connection failure. Browser emulation does not replace physical iPhone/iPad testing.

## Cost and future use

This proof of concept adds $0 in monthly subscription charges on the existing Vercel Hobby and Supabase Free plans. Free usage limits and Supabase inactivity pausing apply. No subscriptions, add-ons or domains were purchased.

Hobby is restricted to personal, noncommercial use. The owner's proof-of-concept direction is not a determination that Hobby permits later operation of a paid art business; review the hosting arrangement before using this for business or real student records. [Vercel terms](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage).

Production still requires the prepared migration approval, protected live configuration, explicit staff grants, deployment verification, backup/restore acceptance and physical-device testing described in [TEST-AND-DEPLOY.md](TEST-AND-DEPLOY.md). Netlify remains an optional later alternative; no Netlify account setup is needed for this proof of concept.
