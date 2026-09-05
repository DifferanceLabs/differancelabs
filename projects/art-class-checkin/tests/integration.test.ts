import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID, createHmac } from "node:crypto";
import pg from "pg";
import sharp from "sharp";
import { app } from "../server/app";
import { hash, localCookie } from "../server/auth";
import type { Bootstrap, Snapshot, RosterRow } from "../src/types";
Object.assign(process.env, parseEnv(readFileSync(".env.local", "utf8")));
const db = new pg.Client({
  connectionString: process.env.ART_MIGRATION_DATABASE_URL,
});
const address = "http://localhost:5173";
type Client = { cookie: string; csrf: string };
let staff: Client,
  admin: Client,
  second: Client,
  data: Bootstrap,
  snapshot: Snapshot,
  sessionId: string;
async function req(
  path: string,
  client?: Client,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const response = await app.request(address + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: address,
      "Content-Type": "application/json",
      ...(client ? { Cookie: client.cookie, "X-CSRF-Token": client.csrf } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const value = contentType.includes("json")
    ? await response.json()
    : await response.arrayBuffer();
  return { response, value };
}
async function login(role = "staff"): Promise<Client> {
  const { response, value } = await req("/api/auth/demo", undefined, { role });
  expect(response.status, JSON.stringify(value)).toBe(200);
  return {
    cookie: response.headers.get("set-cookie")!.split(";")[0],
    csrf: value.csrf,
  };
}
async function change(
  client: Client,
  action: string,
  input: unknown,
  status = 200,
  id = randomUUID(),
) {
  const r = await req("/api/changes", client, {
    operationId: id,
    action,
    input,
  });
  if (r.response.status === 503 && status !== 503) {
    try {
      await db.query("select public.art_write($1,$2,$3,$4)", [
        hash(client.cookie.split("=")[1]),
        id,
        action,
        input,
      ]);
    } catch (error) {
      throw new Error("Local fixture SQL error: " + (error as Error).message);
    }
  }
  expect(r.response.status, JSON.stringify(r.value)).toBe(status);
  return r.value;
}
async function row(index = 0): Promise<RosterRow> {
  const r = await req("/api/sessions/" + sessionId, staff);
  expect(r.response.status).toBe(200);
  snapshot = r.value;
  return snapshot.roster[index];
}
function permission(studentId: string) {
  return data.permissions.find(
    (p) => p.student_id === studentId && p.approved,
  )!;
}
beforeAll(async () => {
  const target = new URL(process.env.ART_MIGRATION_DATABASE_URL!);
  if (
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    target.port !== "55322"
  )
    throw new Error("Tests require the isolated local database on 55322.");
  await db.connect();
  expect(
    (await db.query("select kind from art_checkin.environment")).rows[0].kind,
  ).toBe("demo");
  staff = await login();
  admin = await login("admin");
  second = await login();
  data = (await req("/api/session", admin)).value;
  const date = new Date(Date.now() + Math.random() * 200000000000)
    .toISOString()
    .slice(0, 10);
  sessionId = (
    await change(staff, "session.create", { classId: data.classes[0].id, date })
  ).id;
  await row();
});
afterAll(async () => {
  await db.end();
});
describe("Real PostgreSQL + HTTP authorization and handoffs", () => {
  it("denies direct APIs, forged browser identities, CSRF and staff administration", async () => {
    for (const path of [
      "/api/session",
      "/api/history",
      "/api/export.csv",
      "/api/photos/" + data.adults[0].id,
    ])
      expect((await req(path)).response.status).toBe(401);
    expect(
      (await req("/api/session", { cookie: localCookie + "=forged", csrf: "" }))
        .response.status,
    ).toBe(401);
    expect(
      (
        await req(
          "/api/changes",
          { ...staff, csrf: "bad" },
          {
            operationId: randomUUID(),
            action: "attendance.checkin",
            input: { id: snapshot.roster[0].id, version: 0 },
          },
        )
      ).response.status,
    ).toBe(403);
    expect(
      (
        await req(
          "/api/auth/demo",
          undefined,
          { role: "staff" },
          { Origin: "https://evil.invalid" },
        )
      ).response.status,
    ).toBe(403);
    await change(
      staff,
      "settings.save",
      { businessName: "Unauthorized", timezone: "America/Chicago" },
      403,
    );
    expect((await req("/api/audit", staff)).response.status).toBe(403);
    const permissions = await db.query(
      "select has_function_privilege('anon','public.art_read(text,text,jsonb)','EXECUTE') as rpc,has_table_privilege('authenticated','art_checkin.roster','SELECT') as records",
    );
    expect(permissions.rows[0]).toEqual({ rpc: false, records: false });
  });
  it("requires Present and the child's own current permission", async () => {
    let r = await row();
    const p = permission(r.student_id);
    await change(
      staff,
      "attendance.release",
      {
        id: r.id,
        version: 0,
        permissionId: p.id,
        verification: "Known to staff",
      },
      409,
    );
    await change(staff, "attendance.checkin", { id: r.id, version: 0 });
    r = await row();
    const wrong = data.permissions.find((x) => x.student_id !== r.student_id)!;
    await change(
      staff,
      "attendance.release",
      {
        id: r.id,
        version: r.attendance_version,
        permissionId: wrong.id,
        verification: "Known to staff",
      },
      409,
    );
    await change(admin, "permission.set", {
      id: p.id,
      version: p.version,
      studentId: p.student_id,
      adultId: p.adult_id,
      approved: false,
      relationship: p.relationship,
      note: "Fictional guardian confirmed revocation using contact on file.",
    });
    await change(
      staff,
      "attendance.release",
      {
        id: r.id,
        version: r.attendance_version,
        permissionId: p.id,
        verification: "Known to staff",
      },
      409,
    );
    expect((await row()).status).toBe("Present");
    await change(admin, "permission.set", {
      id: p.id,
      version: p.version + 1,
      studentId: p.student_id,
      adultId: p.adult_id,
      approved: true,
      relationship: p.relationship,
      note: "Fictional test permission restored after checking parent contact.",
    });
  });
  it("commits exactly one concurrent release and resolves timed-out duplicate requests", async () => {
    const r = await row(),
      p = permission(r.student_id);
    const input = {
      id: r.id,
      version: r.attendance_version,
      permissionId: p.id,
      verification: "Photo ID checked",
    };
    const id = randomUUID();
    const [a, b] = await Promise.all([
      req("/api/changes", staff, {
        operationId: id,
        action: "attendance.release",
        input,
      }),
      req("/api/changes", staff, {
        operationId: id,
        action: "attendance.release",
        input,
      }),
    ]);
    expect(a.response.status, JSON.stringify(a.value)).toBe(200);
    expect(b.value).toEqual(a.value);
    expect((await req("/api/operations/" + id, staff)).value).toEqual(a.value);
    await change(second, "attendance.release", input, 409);
    const released = await row();
    expect(released.status).toBe("Released");
    expect(released.release?.name).toBeTruthy();
    expect(released.payment.confirmed).toBe(false);
    expect(
      (
        await db.query(
          "select count(*)::int n from art_checkin.events where roster_id=$1 and kind='attendance.release'",
          [r.id],
        )
      ).rows[0].n,
    ).toBe(1);
    await change(
      staff,
      "attendance.absent",
      { id: r.id, version: released.attendance_version },
      409,
    );
  });
  it("detects separate-device races with independent request IDs", async () => {
    let r = await row(1);
    await change(staff, "attendance.checkin", {
      id: r.id,
      version: r.attendance_version,
    });
    r = await row(1);
    const input = {
      id: r.id,
      version: r.attendance_version,
      permissionId: permission(r.student_id).id,
      verification: "Known to staff",
    };
    const results = await Promise.all(
      [staff, second].map((c) =>
        req("/api/changes", c, {
          operationId: randomUUID(),
          action: "attendance.release",
          input,
        }),
      ),
    );
    expect(results.map((r) => r.response.status).sort()).toEqual([200, 409]);
  });
  it("scopes payment to dated rows, audits edits, and allows absent payment", async () => {
    let r = await row(2);
    await change(staff, "attendance.absent", {
      id: r.id,
      version: r.attendance_version,
    });
    r = await row(2);
    await change(staff, "payment.set", {
      id: r.id,
      version: 0,
      payment: { confirmed: true },
    });
    await change(
      second,
      "payment.set",
      { id: r.id, version: 0, payment: { confirmed: true, method: "Cash" } },
      409,
    );
    await change(
      staff,
      "payment.set",
      { id: r.id, version: 1, payment: { confirmed: false } },
      422,
    );
    await change(staff, "payment.set", {
      id: r.id,
      version: 1,
      payment: { confirmed: false },
      reason: "Checked the wrong fictional receipt; no refund.",
    });
    const history = (
      await req(
        "/api/history?session=" + sessionId + "&student=" + r.student_id,
        staff,
      )
    ).value;
    expect(
      history[0].events.filter((e: any) => e.kind === "payment.set"),
    ).toHaveLength(2);
    expect(history[0].status).toBe("Absent");
    const seed = (
      await db.query(
        "select payment from art_checkin.roster where student_id=$1 and session_id<>$2",
        [r.student_id, sessionId],
      )
    ).rows;
    expect(seed.length).toBeGreaterThan(0);
    // Attendance version was unaffected by payment changes.
    await change(staff, "attendance.checkin", {
      id: r.id,
      version: r.attendance_version,
    });
  });
  it("reconciles paper using actual times, historical permission, no duplicate or blank-paid clearing", async () => {
    let r = await row(3),
      p = permission(r.student_id);
    const arrival = new Date(Date.now() - 7200000).toISOString(),
      departure = new Date(Date.now() - 3600000).toISOString();
    await change(admin, "permission.set", {
      id: p.id,
      version: p.version,
      studentId: p.student_id,
      adultId: p.adult_id,
      approved: false,
      relationship: p.relationship,
      note: "Fictional parent revoked permission after the past handoff.",
    });
    await change(staff, "payment.set", {
      id: r.id,
      version: 0,
      payment: { confirmed: true, method: "Venmo" },
    });
    const paper = {
      id: r.id,
      version: 0,
      arrivalAt: arrival,
      departureAt: departure,
      adultId: p.adult_id,
      verification: "Known to staff",
      staffInitials: "ME",
      paid: false,
    };
    await change(staff, "paper.reconcile", paper);
    r = await row(3);
    expect(r.status).toBe("Released");
    expect(r.payment.confirmed).toBe(true);
    expect(Date.parse(r.departure_at!)).toBe(Date.parse(departure));
    expect((r.release?.authorization as any)?.approved).toBe(true);
    await change(second, "paper.reconcile", {
      ...paper,
      version: r.attendance_version,
    });
    expect(
      (
        await db.query(
          "select count(*)::int n from art_checkin.events where roster_id=$1 and kind='paper.reconcile'",
          [r.id],
        )
      ).rows[0].n,
    ).toBe(1);
    await change(
      staff,
      "paper.reconcile",
      {
        ...paper,
        version: r.attendance_version,
        arrivalAt: new Date(Date.now() - 7000000).toISOString(),
      },
      409,
    );
    await change(admin, "attendance.correct", {
      ...paper,
      version: r.attendance_version,
      status: "Released",
      arrivalAt: new Date(Date.now() - 7000000).toISOString(),
      reason: "Reconciled legible original paper time.",
    });
    const hist = (
      await req(
        "/api/history?student=" + r.student_id + "&session=" + sessionId,
        staff,
      )
    ).value[0];
    expect(
      hist.events.some(
        (e: any) =>
          e.kind === "attendance.correct" && e.before_value.departure_at,
      ),
    ).toBe(true);
    expect(
      Date.parse(
        hist.events.find((e: any) => e.kind === "paper.reconcile").recorded_at,
      ),
    ).toBeGreaterThan(Date.parse(departure));
  });
  it("records unknown/known original paper payment times separately and rejects conflict", async () => {
    const r = await row(4),
      at = new Date(Date.now() - 3600000).toISOString();
    await change(staff, "paper.reconcile", {
      id: r.id,
      version: 0,
      paid: true,
      paymentVersion: 0,
      confirmedAt: at,
      payment: { method: "Cash", amountCents: 2500 },
      staffInitials: "ME",
    });
    const updated = await row(4);
    expect(updated.payment.confirmed).toBe(true);
    expect(Date.parse(updated.payment.confirmedAt!)).toBe(Date.parse(at));
    expect(updated.status).toBe("Expected");
    await change(
      second,
      "paper.reconcile",
      { id: r.id, version: 0, paid: true, paymentVersion: 0 },
      409,
    );
  });
  it("locks grants on each operation and prevents already-signed-in revoked devices", async () => {
    await db.query(
      "delete from public.app_grants where app_slug='art-class-checkin' and user_email='staff@art-demo.invalid'",
    );
    try {
      for (const path of [
        "/api/session",
        "/api/history",
        "/api/export.csv",
        "/api/photos/" + data.adults[0].id,
      ])
        expect((await req(path, staff)).response.status).toBe(403);
    } finally {
      await db.query(
        "insert into public.app_grants(user_email,app_slug,role) values('staff@art-demo.invalid','art-class-checkin','staff')",
      );
    }
    const signed = await login();
    await req("/api/auth/logout", signed, {});
    expect((await req("/api/session", signed)).response.status).toBe(401);
    const expired = await login();
    await db.query(
      "update art_checkin.sessions set expires_at=now()-interval '1 second' where token_hash=$1",
      [hash(expired.cookie.split("=")[1])],
    );
    expect((await req("/api/session", expired)).response.status).toBe(401);
  });
  it("exchanges a signed token once, rejects invalid tokens, and supports an isolated Home Screen cookie jar", async () => {
    process.env.DL_APP_LAUNCH_SECRET = "integration-test-only-key";
    const now = Math.floor(Date.now() / 1000),
      payload = {
        app_slug: "art-class-checkin",
        user_email: "staff@art-demo.invalid",
        issued_at: now,
        expires_at: now + 180,
        nonce: randomUUID(),
      };
    const encoded = [{ alg: "HS256", typ: "JWT" }, payload]
      .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
      .join(".");
    const token =
      encoded +
      "." +
      createHmac("sha256", process.env.DL_APP_LAUNCH_SECRET)
        .update(encoded)
        .digest("base64url");
    expect(
      (await req("/api/auth/exchange", undefined, { token: token + "x" }))
        .response.status,
    ).toBe(401);
    expect(
      (await req("/api/auth/exchange", undefined, { token })).response.status,
    ).toBe(200);
    expect(
      (await req("/api/auth/exchange", undefined, { token })).response.status,
    ).toBe(409);
    const start = await req("/api/auth/device/start", undefined, {});
    const device = {
      cookie: start.response.headers.get("set-cookie")!.split(";")[0],
      csrf: "",
    };
    expect(
      (await req("/api/auth/device/finish", device, {})).value.pending,
    ).toBe(true);
    expect(
      (await req("/api/auth/device/approve", staff, { code: start.value.code }))
        .response.status,
    ).toBe(200);
    const finish = await req("/api/auth/device/finish", device, {});
    expect(finish.response.status).toBe(200);
    const home = {
      cookie: finish.response.headers.get("set-cookie")!.split(";")[0],
      csrf: "",
    };
    expect((await req("/api/session", home)).response.status).toBe(200);
    expect(
      (await req("/api/auth/device/finish", device, {})).response.status,
    ).toBe(401);
  });
  it("serves private multipage backup PDFs and escaped CSV, while immutable audit prevents updates", async () => {
    const backup = await change(staff, "backup.create", { sessionId });
    mkdirSync("output", { recursive: true });
    for (const kind of ["roster.pdf", "reference.pdf"]) {
      const r = await req("/api/backups/" + backup.id + "/" + kind, staff);
      expect(r.response.status).toBe(200);
      expect(r.response.headers.get("cache-control")).toContain("no-store");
      expect(Buffer.from(r.value).subarray(0, 4).toString()).toBe("%PDF");
      writeFileSync("output/" + kind, Buffer.from(r.value));
    }
    expect(
      (await req("/api/export.csv?session=" + sessionId, staff)).response
        .status,
    ).toBe(200);
    await expect(
      db.query(
        "update art_checkin.events set reason='overwrite' where id=(select id from art_checkin.events limit 1)",
      ),
    ).rejects.toMatchObject({ code: "PT403" });
  });
  it("stores sanitized private reference photos and checks role before retrieval", async () => {
    const adult = data.adults[0];
    const form = new FormData();
    const portrait = await sharp({
      create: { width: 80, height: 100, channels: 3, background: "#567566" },
    })
      .png()
      .toBuffer();
    form.set(
      "photo",
      new File([new Uint8Array(portrait)], "fictional-reference.png", {
        type: "image/png",
      }),
    );
    form.set("version", String(adult.version));
    const upload = (client: Client) =>
      app.request(address + "/api/photos/" + adult.id, {
        method: "POST",
        headers: {
          Origin: address,
          Cookie: client.cookie,
          "X-CSRF-Token": client.csrf,
        },
        body: form,
      });
    expect((await upload(staff)).status).toBe(403);
    const response = await upload(admin);
    expect(response.status, await response.clone().text()).toBe(200);
    const photo = await req("/api/photos/" + adult.id, staff);
    expect(photo.response.status).toBe(200);
    expect(photo.response.headers.get("content-type")).toBe("image/webp");
    expect(photo.response.headers.get("cache-control")).toContain("no-store");
    const saved = (
      await db.query("select data from art_checkin.adults where id=$1", [
        adult.id,
      ])
    ).rows[0].data;
    const publicRead = await fetch(
      process.env.SUPABASE_URL +
        "/storage/v1/object/public/art-checkin-photos/" +
        saved.photoPath,
    );
    expect(publicRead.ok).toBe(false);
    expect((await req("/api/photos/" + adult.id)).response.status).toBe(401);
    form.set("version", String(adult.version + 1));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (String(input).endsWith("/rpc/art_write"))
        throw new TypeError("Simulated lost photo-save response after commit");
      return response;
    };
    try {
      expect((await upload(admin)).status).toBe(503);
    } finally {
      globalThis.fetch = originalFetch;
    }
    const committed = (
      await db.query("select data from art_checkin.adults where id=$1", [
        adult.id,
      ])
    ).rows[0].data;
    expect(committed.photoPath).not.toBe(saved.photoPath);
    expect((await req("/api/photos/" + adult.id, staff)).response.status).toBe(
      200,
    );
  });
  it("preserves dated snapshots when student enrollment changes", async () => {
    const r = await row(6),
      student = data.students.find((s) => s.id === r.student_id)!;
    await change(admin, "student.save", {
      id: student.id,
      version: student.version,
      data: { ...student.data, name: "Updated fictional name", archived: true },
    });
    const historical = await row(6);
    expect(historical.student_snapshot.name).toBe(student.data.name);
    expect(historical.payment).toEqual(r.payment);
    const next = (
      await change(staff, "session.create", {
        classId: data.classes[0].id,
        date:
          "2048-01-" +
          String(Math.floor(Math.random() * 27) + 1).padStart(2, "0"),
      })
    ).id;
    const nextRoster = (await req("/api/sessions/" + next, staff)).value.roster;
    expect(nextRoster.some((x: any) => x.student_id === student.id)).toBe(
      false,
    );
    expect(nextRoster.every((x: any) => x.payment.confirmed === false)).toBe(
      true,
    );
  });
  it("fails closed on wrong environment and live mode cannot use demo login", async () => {
    const expected = process.env.ART_EXPECTED_DATABASE_ID;
    process.env.ART_EXPECTED_DATABASE_ID = randomUUID();
    expect((await req("/api/session", staff)).response.status).toBe(503);
    process.env.ART_EXPECTED_DATABASE_ID = expected;
    await db.query("update art_checkin.environment set kind='live'");
    process.env.ART_APP_MODE = "live";
    try {
      expect(
        (await req("/api/auth/demo", undefined, { role: "admin" })).response
          .status,
      ).toBe(404);
    } finally {
      await db.query("update art_checkin.environment set kind='demo'");
      process.env.ART_APP_MODE = "demo";
    }
  });
});
