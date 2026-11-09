const test = require("node:test");
const assert = require("node:assert/strict");
const { requireSameOrigin } = require("../api/_requestSecurity");
const { sendJson, createSessionToken } = require("../api/_auth");
const { requireAdminApi } = require("../api/_admin");

function response() {
  return { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } };
}

test("cookie-authenticated writes reject absent, cross-site and sibling-app origins", () => {
  for (const origin of [undefined, "null", "https://evil.invalid", "https://nomnomgo.differancelabs.com", "http://www.differancelabs.com"]) {
    const res = response();
    assert.equal(requireSameOrigin({ headers: { host: "www.differancelabs.com", origin } }, res, sendJson), false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.headers["Cache-Control"], "no-store");
  }
  for (const host of ["www.differancelabs.com", "differancelabs.com", "differancelabs.vercel.app"]) {
    assert.equal(requireSameOrigin({ headers: { host, origin: `https://${host}` } }, response(), sendJson), true);
  }
  assert.equal(requireSameOrigin({ headers: { host: "localhost:3000", origin: "http://localhost:3000" } }, response(), sendJson), true);
});

test("an authenticated administrator cannot perform a cross-origin write", () => {
  const before = { SESSION_SECRET: process.env.SESSION_SECRET, ALLOWED_ADMIN_EMAIL: process.env.ALLOWED_ADMIN_EMAIL };
  process.env.SESSION_SECRET = "test-only-request-security-key";
  process.env.ALLOWED_ADMIN_EMAIL = "owner@example.invalid";
  try {
    const cookie = `dl_session=${createSessionToken({ email: "owner@example.invalid" })}`;
    const headers = { host: "www.differancelabs.com", cookie };
    const blocked = response();
    assert.equal(requireAdminApi({ method: "POST", headers: { ...headers, origin: "https://nomnomgo.differancelabs.com" } }, blocked), null);
    assert.equal(blocked.statusCode, 403);
    assert.equal(requireAdminApi({ method: "POST", headers: { ...headers, origin: "https://www.differancelabs.com" } }, response()).email, "owner@example.invalid");
    assert.equal(requireAdminApi({ method: "GET", headers }, response()).email, "owner@example.invalid");
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
