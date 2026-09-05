import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyLaunch, csrfFor, equal } from "../server/auth";
import { resolveLocal, localInput } from "../src/time";
import { csvCell } from "../server/reports";
const secret = "test-only-unshared-key";
function token(payload: object, header: object = { alg: "HS256", typ: "JWT" }) {
  const body = [header, payload]
    .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
    .join(".");
  return (
    body + "." + createHmac("sha256", secret).update(body).digest("base64url")
  );
}
describe("Launch protocol", () => {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    app_slug: "art-class-checkin",
    user_email: "staff@example.test",
    issued_at: now,
    expires_at: now + 180,
    nonce: "a".repeat(32),
  };
  it("accepts only the intended signed five claims", () => {
    expect(verifyLaunch(token(claims), secret).user_email).toBe(
      claims.user_email,
    );
    for (const bad of [
      { ...claims, app_slug: "other" },
      { ...claims, expires_at: now - 1 },
      { ...claims, issued_at: now + 60 },
      { ...claims, expires_at: now + 181 },
      { ...claims, admin: true },
      { ...claims, nonce: "short" },
    ])
      expect(() => verifyLaunch(token(bad), secret)).toThrow();
    expect(() =>
      verifyLaunch(token(claims, { alg: "none", typ: "JWT" }), secret),
    ).toThrow();
    expect(() => verifyLaunch(token(claims) + "x", secret)).toThrow();
    expect(() => verifyLaunch(token(claims), "another-key")).toThrow();
  });
  it("binds anti-CSRF tokens to the current session", () => {
    expect(equal(csrfFor("one"), csrfFor("one"))).toBe(true);
    expect(equal(csrfFor("one"), csrfFor("two"))).toBe(false);
  });
});
describe("Business time and CSV", () => {
  it("uses Chicago DST rules and rejects nonexistent / ambiguous paper times", () => {
    expect(resolveLocal("2026-07-01T09:00", "America/Chicago")).toBe(
      "2026-07-01T14:00:00.000Z",
    );
    expect(resolveLocal("2026-01-01T09:00", "America/Chicago")).toBe(
      "2026-01-01T15:00:00.000Z",
    );
    expect(() => resolveLocal("2026-03-08T02:30", "America/Chicago")).toThrow();
    expect(() => resolveLocal("2026-11-01T01:30", "America/Chicago")).toThrow();
    const first = resolveLocal("2026-11-01T01:30", "America/Chicago", "first");
    const second = resolveLocal(
      "2026-11-01T01:30",
      "America/Chicago",
      "second",
    );
    expect(new Date(second!).getTime() - new Date(first!).getTime()).toBe(
      3600000,
    );
    expect(localInput(first, "America/Chicago")).toBe("2026-11-01T01:30");
  });
  it("escapes commas, quotes, newlines and spreadsheet formulas", () => {
    expect(csvCell('Long, "name"\nNext')).toBe('"Long, ""name""\nNext"');
    expect(csvCell("=HYPERLINK()")).toBe('"\'=HYPERLINK()"');
  });
});
