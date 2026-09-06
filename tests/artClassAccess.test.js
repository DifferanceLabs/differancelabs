const assert = require("node:assert/strict");
const test = require("node:test");
const { createSessionToken, createAppLaunchToken } = require("../api/_auth");
const {
  hasAppGrant,
  getAppsForUser,
  toClientApp,
  toLauncherApp,
} = require("../api/_supabase");
const { getFallbackAppsForEmail } = require("../api/session");
const launch = require("../api/apps/launch");
test("art grants, launch transport and degraded behavior stay isolated", async (t) => {
  const saved = { ...process.env },
    originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
    for (const k of Object.keys(process.env))
      if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  });
  Object.assign(process.env, {
    ALLOWED_ADMIN_EMAIL: "owner@example.test",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "fixture",
    SESSION_SECRET: "fixture-session",
    DL_APP_LAUNCH_SECRET: "fixture-launch",
    APP_URL_ART_CLASS_CHECKIN: "https://art.example.test",
  });
  let grant = false;
  global.fetch = async (url) => {
    const parsed = new URL(url);
    const rows = parsed.pathname.endsWith("app_grants")
      ? grant
        ? [{ app_slug: "art-class-checkin" }]
        : []
      : [
          {
            slug: "art-class-checkin",
            name: "Art Class Check-In",
            status: "active",
            url: null,
          },
          { slug: "nomnomgo", name: "NomNomGo", status: "active" },
        ].filter(
          (r) =>
            !parsed.searchParams.get("slug") ||
            parsed.searchParams.get("slug") === "eq." + r.slug,
        );
    return { ok: true, status: 200, text: async () => JSON.stringify(rows) };
  };
  assert.equal(
    await hasAppGrant("owner@example.test", "art-class-checkin"),
    false,
  );
  assert.equal(await hasAppGrant("owner@example.test", "nomnomgo"), true);
  assert.equal(
    (await getAppsForUser("owner@example.test")).some(
      (a) => a.slug === "art-class-checkin",
    ),
    false,
  );
  assert.equal(
    getFallbackAppsForEmail("owner@example.test").some(
      (a) => a.slug === "art-class-checkin",
    ),
    false,
  );
  grant = true;
  const cards = await getAppsForUser("owner@example.test");
  const card = cards.find((a) => a.slug === "art-class-checkin");
  assert.equal(card.launchPath, "/api/apps/launch?app=art-class-checkin");
  assert.equal("url" in card, false);
  delete process.env.APP_URL_ART_CLASS_CHECKIN;
  assert.equal(
    toLauncherApp(toClientApp({ slug: "art-class-checkin", status: "active" }))
      .active,
    false,
  );
  process.env.APP_URL_ART_CLASS_CHECKIN = "https://art.example.test";
  const headers = {};
  const response = {
    setHeader: (key, val) => (headers[key] = val),
    writeHead: (status, h) => {
      response.status = status;
      Object.assign(headers, h);
    },
    end: (body) => (response.body = body),
  };
  const req = {
    method: "GET",
    url: "/api/apps/launch?app=art-class-checkin",
    headers: {
      host: "www.differancelabs.com",
      cookie:
        "dl_session=" + createSessionToken({ email: "owner@example.test" }),
    },
  };
  await launch(req, response);
  assert.equal(response.status, 302);
  const destination = new URL(headers.Location);
  assert.equal(destination.searchParams.has("dl_launch_token"), false);
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  const token = new URLSearchParams(destination.hash.slice(1)).get(
    "dl_launch_token",
  );
  assert.deepEqual(
    Object.keys(
      JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()),
    ).sort(),
    ["app_slug", "expires_at", "issued_at", "nonce", "user_email"],
  );
  const legacy = JSON.parse(
    Buffer.from(
      createAppLaunchToken({ slug: "nomnomgo" }, "owner@example.test").split(
        ".",
      )[1],
      "base64url",
    ).toString(),
  );
  assert.ok(legacy.iat && legacy.exp);
  grant = false;
  await launch(req, response);
  assert.equal(headers.Location, "/apps?error=app_not_granted");
});
