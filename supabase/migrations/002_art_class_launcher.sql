-- PREPARED ONLY: requires explicit production database approval (AGENTS.md).
-- Existing apps, users, and grants are unchanged. No student data is stored here.
-- Inactive until the independently deployed app, private database, and staff
-- grants have been verified. Set its URL / activity as documented in the app.
insert into public.apps(slug,name,url,description,status)
values('art-class-checkin','Art Class Check-In',null,
       'Private staff attendance, verified pickup, and manual payment confirmation.',
       'inactive')
on conflict(slug) do nothing;
