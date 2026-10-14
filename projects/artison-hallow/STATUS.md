# Artison Hallow MVP status

## Completed in review branch
- Public responsive site shell with all requested launch-page destinations.
- Moody Pastel, Light Pastel and Evening theme presets.
- Proposed offerings/prices and draft America/Chicago schedule.
- Free interest workflow and separate refundable early-hold demo workflow.
- Duplicate child/slot guard in preview.
- Parent management-code preview.
- Owner launch/theme/deposit/capacity controls and demand CSV demo.
- Square hosted Checkout server adapter with live-payment kill switch.
- Square webhook signature verification scaffold.
- Portable Supabase migration with booking/payment/deposit/audit concepts.
- Noindex demo metadata; no invented address, testimonials, studio photography or opening date.

## Before live launch
1. Apply the reviewed Supabase migration to a dedicated Artison Hallow project.
2. Replace preview browser storage with the server repository layer.
3. Add owner authentication and instructor role UI against the migration.
4. Configure Artison Hallow Square Sandbox credentials/location and webhook URL.
5. Complete Sandbox checkout/refund/reconciliation tests, then explicitly enable live payments.
6. Configure transactional email provider and scheduled deadline/refund jobs.
7. Add durable object storage media upload UI.
8. Confirm legal/policy copy, tax configuration, premises, contact details, hours and opening date.
9. Run WCAG audit and full browser E2E suite after the server data layer is connected.

The current branch is a working, reviewable demo preview, not a production booking system and does not collect money.
