import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import sharp from "sharp";
import { randomBytes, randomUUID } from "node:crypto";
import {
  hash,
  randomToken,
  csrfFor,
  equal,
  verifyLaunch,
  sessionCookie,
  localCookie,
} from "./auth";
import { database, rpc, assertEnvironment, ApiError } from "./db";
import { changes, changeEnvelope, historyQuery } from "./validation";
import { backupPdf, historyCsv } from "./reports";
import type {
  Bootstrap,
  Snapshot,
  HistoryRow,
  Entity,
  AdultData,
} from "../src/types";
type Vars = { session: string; token: string };
export const app = new Hono<{
  Variables: Vars;
  Bindings: { deploymentVersion?: string };
}>();
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 2200000,
    onError: (c) => c.json({ error: "This request is too large." }, 413),
  }),
);
function secure() {
  return process.env.ART_APP_ORIGIN?.startsWith("https://") ?? true;
}
function cookieName() {
  return secure() ? sessionCookie : localCookie;
}
function origin() {
  return process.env.ART_APP_ORIGIN?.replace(/\/$/, "");
}
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    if (!origin() || c.req.header("origin") !== origin())
      throw new ApiError(
        403,
        "Open the app at its configured address before saving.",
      );
    if (Number(c.req.header("content-length") || 0) > 2200000)
      throw new ApiError(413, "This upload is too large.");
  }
  if (c.req.path !== "/api/health") await assertEnvironment();
  await next();
});
app.get("/api/health", async (c) => {
  try {
    await assertEnvironment();
    return c.json({
      ok: true,
      version:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
        c.env?.deploymentVersion ||
        "local",
    });
  } catch {
    return c.json({ ok: false }, 503);
  }
});
app.get("/api/config", (c) =>
  c.json({
    mode: process.env.ART_APP_MODE,
    portal:
      (process.env.DL_PORTAL_ORIGIN || "https://www.differancelabs.com") +
      "/apps",
    version:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
      c.env?.deploymentVersion ||
      "local",
  }),
);
async function limit(c: any, key: string, count: number) {
  const ip =
    c.req.header("x-vercel-forwarded-for") ||
    c.req.header("x-forwarded-for") ||
    "local";
  if (
    !(await rpc<boolean>("art_rate_limit", {
      p_key: hash(key + ip),
      p_limit: count,
    }))
  )
    throw new ApiError(
      429,
      "Too many attempts. Wait one minute and try again.",
    );
}
function establish(c: any, token: string) {
  setCookie(c, cookieName(), token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "Lax",
    path: "/",
    maxAge: 43200,
  });
}
app.post("/api/auth/exchange", async (c) => {
  await limit(c, "exchange", 20);
  const { token } = z
    .object({ token: z.string().max(4096) })
    .parse(await c.req.json());
  const secret = process.env.DL_APP_LAUNCH_SECRET;
  if (!secret) throw new ApiError(503, "DL_APP_LAUNCH_SECRET");
  let claims;
  try {
    claims = verifyLaunch(token, secret);
  } catch (e) {
    throw new ApiError(401, (e as Error).message);
  }
  const session = randomToken();
  const user = await rpc("art_auth", {
    p_action: "exchange",
    p_input: {
      email: claims.user_email,
      sessionHash: hash(session),
      nonceHash: hash(claims.nonce),
      expiresAt: new Date(claims.expires_at * 1000).toISOString(),
    },
  });
  establish(c, session);
  return c.json({ user, csrf: csrfFor(session) });
});
app.post("/api/auth/demo", async (c) => {
  if (process.env.ART_APP_MODE !== "demo")
    throw new ApiError(404, "Not found.");
  await limit(c, "demo", 30);
  const { role } = z
    .object({ role: z.enum(["admin", "staff"]) })
    .parse(await c.req.json());
  const token = randomToken();
  const user = await rpc("art_auth", {
    p_action: "demo",
    p_input: { email: role + "@art-demo.invalid", sessionHash: hash(token) },
  });
  establish(c, token);
  return c.json({ user, csrf: csrfFor(token) });
});
app.post("/api/auth/device/start", async (c) => {
  await limit(c, "device-start", 10);
  const verifier = randomToken(),
    code = randomBytes(5).toString("hex").toUpperCase();
  setCookie(c, secure() ? "__Host-art_device" : "art_device", verifier, {
    httpOnly: true,
    secure: secure(),
    sameSite: "Lax",
    path: "/",
    maxAge: 300,
  });
  return c.json(
    await rpc("art_auth", {
      p_action: "device-start",
      p_input: { verifierHash: hash(verifier), code },
    }),
  );
});
app.post("/api/auth/device/finish", async (c) => {
  const verifier = getCookie(c, secure() ? "__Host-art_device" : "art_device");
  if (!verifier) throw new ApiError(401, "Start device sign-in again.");
  const token = randomToken(),
    result = await rpc<any>("art_auth", {
      p_action: "device-finish",
      p_input: { verifierHash: hash(verifier), sessionHash: hash(token) },
    });
  if (!result.pending) {
    establish(c, token);
    deleteCookie(c, secure() ? "__Host-art_device" : "art_device", {
      path: "/",
    });
  }
  return c.json(result);
});
app.use("/api/*", async (c, next) => {
  const token = getCookie(c, cookieName());
  if (!token) throw new ApiError(401, "Sign in to use the app.");
  c.set("token", token);
  c.set("session", hash(token));
  if (
    c.req.method !== "GET" &&
    !equal(c.req.header("x-csrf-token") || "", csrfFor(token))
  )
    throw new ApiError(
      403,
      "Your sign-in state changed. Reload before saving.",
    );
  await next();
});
app.get("/api/session", async (c) => {
  const data = await rpc<Bootstrap>("art_read", {
    p_session: c.get("session"),
    p_action: "bootstrap",
    p_input: {},
  });
  return c.json({ ...data, csrf: csrfFor(c.get("token")) });
});
app.post("/api/auth/logout", async (c) => {
  await rpc("art_auth", {
    p_action: "logout",
    p_input: { sessionHash: c.get("session") },
  });
  deleteCookie(c, cookieName(), { path: "/", secure: secure() });
  return c.json({ ok: true });
});
app.post("/api/auth/device/approve", async (c) => {
  await limit(c, "device-approve", 8);
  const { code } = z
    .object({ code: z.string().regex(/^[A-F0-9]{10}$/) })
    .parse(await c.req.json());
  return c.json(
    await rpc("art_auth", {
      p_action: "device-approve",
      p_input: { sessionHash: c.get("session"), code },
    }),
  );
});
app.get("/api/sessions/:id", async (c) =>
  c.json(
    await rpc("art_read", {
      p_session: c.get("session"),
      p_action: "session",
      p_input: { id: z.uuid().parse(c.req.param("id")) },
    }),
  ),
);
app.get("/api/operations/:id", async (c) =>
  c.json(
    await rpc("art_read", {
      p_session: c.get("session"),
      p_action: "operation",
      p_input: { id: z.uuid().parse(c.req.param("id")) },
    }),
  ),
);
app.get("/api/history", async (c) =>
  c.json(
    await rpc("art_read", {
      p_session: c.get("session"),
      p_action: "history",
      p_input: historyQuery.parse(c.req.query()),
    }),
  ),
);
app.get("/api/audit", async (c) =>
  c.json(
    await rpc("art_read", {
      p_session: c.get("session"),
      p_action: "audit",
      p_input: {},
    }),
  ),
);
app.post("/api/changes", async (c) => {
  if (Number(c.req.header("content-length") || 0) > 100000)
    throw new ApiError(413, "This request is too large.");
  const body = changeEnvelope.parse(await c.req.json());
  if (!changes[body.action]) throw new ApiError(422, "Unknown change.");
  const input = changes[body.action].parse(body.input);
  return c.json(
    await rpc("art_write", {
      p_session: c.get("session"),
      p_operation: body.operationId,
      p_action: body.action,
      p_input: input,
    }),
  );
});
app.get("/api/backups/:id/:kind", async (c) => {
  const id = z.uuid().parse(c.req.param("id")),
    kind = z.enum(["roster.pdf", "reference.pdf"]).parse(c.req.param("kind"));
  const snapshot = await rpc<Snapshot>("art_read", {
    p_session: c.get("session"),
    p_action: "backup",
    p_input: { id },
  });
  const pdf = await backupPdf(
    { ...snapshot, demo: process.env.ART_APP_MODE === "demo" },
    kind === "reference.pdf",
  );
  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", 'inline; filename="art-' + kind + '"');
  return c.body(new Uint8Array(pdf));
});
app.get("/api/export.csv", async (c) => {
  const filters = historyQuery.parse(c.req.query());
  let rows: HistoryRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const part = await rpc<HistoryRow[]>("art_read", {
      p_session: c.get("session"),
      p_action: "history",
      p_input: { ...filters, offset, limit: 1000 },
    });
    rows.push(...part);
    if (part.length < 1000) break;
  }
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header(
    "Content-Disposition",
    'attachment; filename="art-attendance-payments.csv"',
  );
  return c.body("\uFEFF" + historyCsv(rows));
});
app.get("/api/photos/:id", async (c) => {
  const adult = await rpc<Entity<AdultData>>("art_read", {
    p_session: c.get("session"),
    p_action: "adult",
    p_input: { id: z.uuid().parse(c.req.param("id")) },
  });
  if (!adult.data.photoPath) throw new ApiError(404, "No reference photo.");
  const { data, error } = await database()
    .storage.from("art-checkin-photos")
    .download(adult.data.photoPath);
  if (error || !data)
    throw new ApiError(503, "Photo is temporarily unavailable.");
  c.header("Content-Type", "image/webp");
  return c.body(new Uint8Array(await data.arrayBuffer()));
});
app.post("/api/photos/:id", async (c) => {
  const id = z.uuid().parse(c.req.param("id"));
  const bootstrap = await rpc<Bootstrap>("art_read", {
    p_session: c.get("session"),
    p_action: "bootstrap",
    p_input: {},
  });
  if (bootstrap.user.role !== "admin")
    throw new ApiError(403, "App administrator access required.");
  const adult = bootstrap.adults.find((a) => a.id === id);
  if (!adult) throw new ApiError(404, "Adult not found.");
  const form = await c.req.formData(),
    file = form.get("photo");
  if (!(file instanceof File) || file.size > 2097152)
    throw new ApiError(422, "Choose a portrait photo smaller than 2 MB.");
  const version = z.coerce
    .number()
    .int()
    .nonnegative()
    .parse(form.get("version"));
  let bytes: Buffer;
  try {
    bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 20000000,
    })
      .rotate()
      .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ApiError(
      422,
      "Choose a JPEG, PNG, or WebP portrait photo. Do not upload an ID document.",
    );
  }
  const path = id + "/" + randomUUID() + ".webp",
    storage = database().storage.from("art-checkin-photos");
  const uploaded = await storage.upload(path, bytes, {
    contentType: "image/webp",
    upsert: false,
  });
  if (uploaded.error)
    throw new ApiError(503, "Photo upload could not be confirmed.");
  try {
    return c.json(
      await rpc("art_write", {
        p_session: c.get("session"),
        p_operation: randomUUID(),
        p_action: "adult.photo",
        p_input: { id, version, photoPath: path },
      }),
    );
  } catch (e) {
    // A lost RPC response may follow a committed photo update. Retain the
    // private object on an uncertain result so that a saved reference survives.
    // Only a definitive transaction rejection is safe to clean up here.
    if (e instanceof ApiError && e.status < 500) await storage.remove([path]);
    throw e;
  }
});
app.onError((error, c) => {
  if (error instanceof z.ZodError)
    return c.json(
      {
        error: "Check the form fields and try again.",
        code: "validation",
        fields: error.issues.map((i) => i.path.join(".")),
      },
      422,
    );
  if (error instanceof ApiError)
    return c.json(
      {
        error: error.message,
        code:
          error.status === 409
            ? "conflict"
            : error.status >= 500
              ? "uncertain"
              : "request_failed",
      },
      error.status as any,
    );
  // Never log request URLs, bodies, launch tokens, or private records.
  console.error("Art API request failed", {
    requestId: c.req.header("x-vercel-id")?.slice(0, 100) || "local",
    type: error.name,
  });
  return c.json(
    {
      error:
        "The server could not confirm the operation. Check its status before retrying.",
      code: "uncertain",
    },
    503,
  );
});
app.notFound((c) => c.json({ error: "Not found." }, 404));
