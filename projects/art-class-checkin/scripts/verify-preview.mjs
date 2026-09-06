// Explicit opt-in check of a configured fictional database. Server handlers run
// locally; Supabase requests use the selected environment's real HTTPS API.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { loadEnvironment } from "./tool-env.mjs";
import vercelHandler from "../api/index.ts";

if (!process.env.ART_ENV_FILE)
  throw new Error(
    "Set ART_ENV_FILE to the private fictional preview configuration.",
  );
loadEnvironment();
if (process.env.ART_APP_MODE !== "demo")
  throw new Error("Preview verification refuses live mode.");
const httpIndex = process.argv.indexOf("--http");
const httpUrl = httpIndex >= 0 ? new URL(process.argv[httpIndex + 1]) : null;
if (
  httpUrl &&
  httpUrl.protocol !== "https:" &&
  !(
    httpUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(httpUrl.hostname)
  )
)
  throw new Error(
    "HTTP verification requires HTTPS or a loopback test server.",
  );
const origin = httpUrl?.origin || process.env.ART_APP_ORIGIN;
const send = httpUrl
  ? (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(35000) })
  : (input, init) => vercelHandler.fetch(new Request(input, init));
const clients = [];
let administrator, testClassId;
async function request(path, client, body) {
  const response = await send(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(client ? { Cookie: client.cookie, "X-CSRF-Token": client.csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const type = response.headers.get("content-type") || "";
  const value = type.includes("json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { response, value };
}
async function login(role) {
  const result = await request("/api/auth/demo", undefined, { role });
  assert.equal(result.response.status, 200, "Fictional sign-in failed");
  const client = {
    cookie: result.response.headers.get("set-cookie").split(";")[0],
    csrf: result.value.csrf,
  };
  clients.push(client);
  return client;
}
async function change(
  client,
  action,
  input,
  expected = 200,
  operationId = randomUUID(),
) {
  const result = await request("/api/changes", client, {
    operationId,
    action,
    input,
  });
  assert.equal(
    result.response.status,
    expected,
    action + " returned an unexpected status",
  );
  return result.value;
}
try {
  const health = await request("/api/health");
  assert.equal(
    health.response.status,
    200,
    "Configured database health failed",
  );
  assert.equal(
    health.value.ok,
    true,
    "Health route did not reach the configured API",
  );
  for (const path of ["/api/session", "/api/history", "/api/export.csv"])
    assert.equal(
      (await request(path)).response.status,
      401,
      "Private API allowed unsigned access",
    );
  administrator = await login("admin");
  const first = await login("staff"),
    second = await login("staff");
  const data = (await request("/api/session", administrator)).value;
  assert.equal(data.settings.kind, "demo");
  assert.equal(
    data.settings.id,
    process.env.ART_EXPECTED_DATABASE_ID,
    "The HTTP server is connected to a different database than the selected test environment",
  );
  assert.ok(data.students.length >= 2, "Preview needs fictional students");
  const testClass = await change(administrator, "class.save", {
    data: {
      name: "Verification " + new Date().toISOString(),
      instructor: "Fictional test staff",
      studentIds: data.students.map((s) => s.id),
      archived: false,
    },
  });
  testClassId = testClass.id;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: data.settings.timezone,
  }).format(new Date());
  const session = await change(first, "session.create", {
    classId: testClassId,
    date,
  });
  const snapshot = async (client) =>
    (await request("/api/sessions/" + session.id, client)).value;
  let roster = (await snapshot(first)).roster;
  assert.ok(
    roster.every((r) => r.payment.confirmed === false),
    "New session carried payment confirmations",
  );
  const id = roster[0].id;
  const permission = data.permissions.find(
    (p) => p.student_id === roster[0].student_id && p.approved,
  );
  assert.ok(permission, "Preview student needs an approved adult");
  const release = {
    id,
    version: 0,
    permissionId: permission.id,
    verification: "Known to staff",
  };
  await change(first, "attendance.release", release, 409);
  const operationId = randomUUID();
  const checkin = await change(
    first,
    "attendance.checkin",
    { id, version: 0 },
    200,
    operationId,
  );
  const retry = await change(
    first,
    "attendance.checkin",
    { id, version: 0 },
    200,
    operationId,
  );
  assert.equal(
    retry.operationId,
    checkin.operationId,
    "Retry created another operation",
  );
  const operation = (await request("/api/operations/" + operationId, second))
    .value;
  assert.equal(
    operation.operationId,
    operationId,
    "Saved-operation reconciliation failed",
  );
  let row = (await snapshot(second)).roster.find((r) => r.id === id);
  assert.equal(
    row.status,
    "Present",
    "Second session did not see the saved check-in",
  );
  await change(first, "payment.set", {
    id,
    version: row.payment_version,
    payment: { confirmed: true, method: "Cash" },
  });
  await change(
    second,
    "payment.set",
    { id, version: row.payment_version, payment: { confirmed: true } },
    409,
  );
  release.version = row.attendance_version;
  const releases = await Promise.allSettled(
    [first, second].map((client) =>
      request("/api/changes", client, {
        operationId: randomUUID(),
        action: "attendance.release",
        input: release,
      }),
    ),
  );
  assert.ok(
    releases.every((r) => r.status === "fulfilled"),
    "Concurrent release request failed before returning",
  );
  assert.deepEqual(
    releases.map((r) => r.value.response.status).sort(),
    [200, 409],
    "Concurrent releases were not atomic",
  );
  row = (await snapshot(first)).roster.find((r) => r.id === id);
  assert.equal(row.status, "Released");
  assert.equal(row.payment.confirmed, true);
  const paperRow = (await snapshot(first)).roster.find((r) => r.id !== id);
  const originalTime = new Date(Date.now() - 3600000).toISOString();
  await change(first, "paper.reconcile", {
    id: paperRow.id,
    version: paperRow.attendance_version,
    paid: true,
    paymentVersion: paperRow.payment_version,
    confirmedAt: originalTime,
    staffInitials: "TEST",
  });
  const paperSaved = (await snapshot(second)).roster.find(
    (r) => r.id === paperRow.id,
  );
  assert.equal(
    Date.parse(paperSaved.payment.confirmedAt),
    Date.parse(originalTime),
  );
  assert.ok(
    Date.parse(paperSaved.payment.recordedAt) > Date.parse(originalTime),
  );
  const historyResult = await request(
    "/api/history?session=" + session.id,
    first,
  );
  assert.equal(historyResult.response.status, 200, "Filtered history failed");
  const history = historyResult.value;
  assert.ok(Array.isArray(history), "History must return a record list");
  const studentHistory = history.find((r) => r.id === id);
  assert.equal(
    studentHistory.events.filter((e) => e.kind === "attendance.release").length,
    1,
  );
  assert.ok(studentHistory.events.some((e) => e.kind === "payment.set"));
  const backup = await change(first, "backup.create", {
    sessionId: session.id,
  });
  for (const kind of ["roster.pdf", "reference.pdf"]) {
    const result = await request(
      "/api/backups/" + backup.id + "/" + kind,
      first,
    );
    assert.equal(result.response.status, 200);
    assert.equal(result.value.subarray(0, 4).toString(), "%PDF");
    assert.ok(
      result.response.headers.get("cache-control").includes("no-store"),
    );
  }
  assert.equal(
    (await request("/api/export.csv?session=" + session.id, second)).response
      .status,
    200,
  );
  // An unlinked fictional adult keeps the synthetic storage-test image away
  // from the normal demo's pickup permissions. Reuse it on subsequent runs.
  const storageName = "Fictional storage verification";
  let storageAdult = data.adults.find(
    (adult) => adult.data.name === storageName,
  );
  if (!storageAdult) {
    const created = await change(administrator, "adult.save", {
      data: { name: storageName, phone: "" },
    });
    storageAdult = (
      await request("/api/session", administrator)
    ).value.adults.find((adult) => adult.id === created.id);
  }
  assert.ok(storageAdult);
  const portrait = await sharp({
    create: { width: 80, height: 100, channels: 3, background: "#567566" },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set("version", String(storageAdult.version));
  form.set(
    "photo",
    new File([new Uint8Array(portrait)], "fictional-reference.png", {
      type: "image/png",
    }),
  );
  const photoPath = "/api/photos/" + storageAdult.id;
  const upload = (client) =>
    send(origin + photoPath, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: client.cookie,
        "X-CSRF-Token": client.csrf,
      },
      body: form,
    });
  assert.equal(
    (await upload(first)).status,
    403,
    "Staff could change a reference photo",
  );
  assert.equal(
    (await upload(administrator)).status,
    200,
    "Cloud photo save failed",
  );
  const photo = await request(photoPath, second);
  assert.equal(photo.response.status, 200);
  assert.equal(photo.response.headers.get("content-type"), "image/webp");
  assert.ok(photo.response.headers.get("cache-control").includes("no-store"));
  assert.equal((await request(photoPath)).response.status, 401);
  const savedAdult = (
    await request("/api/session", administrator)
  ).value.adults.find((adult) => adult.id === storageAdult.id);
  const publicPhoto = await fetch(
    process.env.SUPABASE_URL +
      "/storage/v1/object/public/art-checkin-photos/" +
      savedAdult.data.photoPath,
  );
  assert.equal(
    publicPhoto.ok,
    false,
    "Cloud storage exposed a private photo publicly",
  );
  await request("/api/auth/logout", second, {});
  assert.equal((await request("/api/session", second)).response.status, 401);
  console.log(
    "PASS: database identity, unsigned access, separate sessions, persistence, idempotent retry, concurrent release/payment, paper payment times, audited history, private PDFs/CSV/photos, and logout.",
  );
  console.log(
    httpUrl
      ? "Verified the HTTP server and configured Supabase API. This does not verify physical devices."
      : "Server handlers ran locally against the configured Supabase API. This does not verify a hosted frontend or physical devices.",
  );
} finally {
  if (administrator && testClassId) {
    const current = (
      await request("/api/session", administrator)
    ).value.classes?.find((c) => c.id === testClassId);
    if (current)
      await change(administrator, "class.save", {
        id: current.id,
        version: current.version,
        data: { ...current.data, archived: true },
      });
  }
  for (const client of clients) await request("/api/auth/logout", client, {});
}
