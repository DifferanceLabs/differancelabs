import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
export const sessionCookie = "__Host-art_session";
export const localCookie = "art_session_local";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export const csrfFor = (value: string) =>
  createHmac("sha256", value).update("art-checkin-csrf-v1").digest("base64url");
export function equal(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
const claims = z
  .object({
    app_slug: z.literal("art-class-checkin"),
    user_email: z.email(),
    issued_at: z.number().int(),
    expires_at: z.number().int(),
    nonce: z.string().min(16).max(100),
  })
  .strict();
export function verifyLaunch(
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || token.length > 4096) throw new Error();
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (
      header.alg !== "HS256" ||
      header.typ !== "JWT" ||
      Object.keys(header).some((k) => !["alg", "typ"].includes(k))
    )
      throw new Error();
    const signature = createHmac("sha256", secret)
      .update(parts[0] + "." + parts[1])
      .digest("base64url");
    if (!equal(signature, parts[2])) throw new Error();
    const c = claims.parse(
      JSON.parse(Buffer.from(parts[1], "base64url").toString()),
    );
    if (
      c.expires_at <= now ||
      c.issued_at > now ||
      c.expires_at <= c.issued_at ||
      c.expires_at - c.issued_at > 180
    )
      throw new Error();
    return { ...c, user_email: c.user_email.trim().toLowerCase() };
  } catch {
    throw new Error(
      "Invalid or expired launch link. Sign in through Differance Labs again.",
    );
  }
}
