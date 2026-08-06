const assert = require("node:assert/strict");
const test = require("node:test");

const { APP_CATALOG } = require("../api/_auth");
const { toClientApp, toLauncherApp } = require("../api/_supabase");

test("NomNomGo has a source-controlled alpha launch target", () => {
  const catalogApp = APP_CATALOG.find((app) => app.key === "nomnomgo");

  assert.ok(catalogApp);
  assert.equal(catalogApp.url, "https://nomnomgo.differancelabs.com");
  assert.equal(catalogApp.statusLabel, "Alpha");
});

test("an active NomNomGo database row becomes a protected launcher card", () => {
  const app = toClientApp({
    slug: "nomnomgo",
    name: "NomNomGo",
    status: "active",
    url: null,
  });

  assert.equal(app.url, "https://nomnomgo.differancelabs.com");
  assert.deepEqual(toLauncherApp(app), {
    key: "nomnomgo",
    slug: "nomnomgo",
    name: "NomNomGo",
    kind: "App",
    description: null,
    status: "active",
    statusLabel: "Alpha",
    active: true,
    launchPath: "/api/apps/launch?app=nomnomgo",
  });
});
