# Artison Hallow

A separately bounded Artison Hallow preview hosted under the Differance Labs Vercel repository without changing Differance Labs authentication, billing, branding, DNS or production database.

## Preview
Static app: `/artison-hallow/`. It is intentionally `noindex,nofollow`.

## Architecture
The review branch uses a static owner/customer preview so missing credentials do not block review. Demo records are labeled and stored in browser localStorage only. Production persistence is designed for a dedicated Supabase/PostgreSQL boundary using the included migration. Square integration is server-only under `/api/artison-hallow` and defaults to disabled.

Square Checkout uses server-created hosted payment links. Payment/enrollment state must remain separate. A redirect is never proof of payment; production activation requires verified Square payment/order data and signed webhooks.

## Local
From repository root: `npm install`, then `npm run dev`, then open `http://localhost:3000/artison-hallow/`.

## Migration checklist
Export database + media inventory; restore and verify counts; move public URL/base path/origins; configure DNS/SSL; update auth callbacks/cookies; update Square redirect/webhook notification URLs and signature configuration; update email sending domain; move scheduled refund/reminder jobs; verify backups; remove preview noindex only after business details are confirmed; add redirects; retain old environment for rollback until payment IDs, deposits, access links and credit balances reconcile.
