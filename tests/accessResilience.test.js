const assert = require("node:assert/strict");
const test = require("node:test");

const { hasAppGrant } = require("../api/_supabase");
const { getFallbackAppsForEmail } = require("../api/session");

test("the launch grant check uses the same app_slug field as the session lookup", async (t) => {
  const originalFetch = global.fetch;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  t.after(() => {
    global.fetch = originalFetch;
    if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalSupabaseUrl;
    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  let requestUrl = null;
  global.fetch = async (url) => {
    requestUrl = new URL(url);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ app_slug: "nomnomgo" }]),
    };
  };

  assert.equal(await hasAppGrant("Tester@Example.com", "NomNomGo"), true);
  assert.equal(requestUrl.searchParams.get("select"), "app_slug");
  assert.equal(requestUrl.searchParams.get("user_email"), "eq.tester@example.com");
  assert.equal(requestUrl.searchParams.get("app_slug"), "eq.nomnomgo");
});

test("degraded admin fallback apps do not claim they can launch", (t) => {
  const originalAdminEmail = process.env.ALLOWED_ADMIN_EMAIL;

  t.after(() => {
    if (originalAdminEmail === undefined) delete process.env.ALLOWED_ADMIN_EMAIL;
    else process.env.ALLOWED_ADMIN_EMAIL = originalAdminEmail;
  });

  process.env.ALLOWED_ADMIN_EMAIL = "admin@example.com";
  const apps = getFallbackAppsForEmail("admin@example.com");
  const admin = apps.find((app) => app.slug === "admin");
  const nomnomgo = apps.find((app) => app.slug === "nomnomgo");

  assert.equal(admin.active, true);
  assert.equal(admin.launchPath, "/admin");
  assert.equal(nomnomgo.active, false);
  assert.equal(nomnomgo.launchPath, null);
  assert.deepEqual(getFallbackAppsForEmail("someone@example.com"), []);
});
