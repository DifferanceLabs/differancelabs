# November 2 dependency patch

Pin Zod to 4.6.6 for GHSA-mrhx-c7xc-m3w5 and @hono/node-server to 2.1.3
for GHSA-rmxm-3fg6-px4f. No database schema, OAuth, access policy, app mode or
runtime environment value changes are included.

The roster regression passes an oversized array of invalid student IDs through
the real class-save schema and requires one bounded length error instead of an
error object for every child. Existing API body-size limits remain active.
The Hono static-serving adapter is used by the loopback-only development server;
no hosted static-authentication bypass was demonstrated.

Local locked audit is clear; type checks, 14 isolated unit/simulation tests and
the production build pass. Local Supabase/Docker setup is unavailable, so the
hosted release workflow must verify the database integration, Netlify adapter,
and Chromium/WebKit browser scenarios before merging into feat/art-class-checkin.

The existing hosted /api/session response was 503 before this patch. A successful
build/deployment does not establish backend health: verify runtime configuration,
database connectivity and the art_identity environment match separately. Do not
apply production migrations or change identity configuration to bypass this check.
