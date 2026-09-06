// App-only encrypted logical backup: every durable app table, compatible SQL,
// referenced private photo objects, and an access reference for recovery.
// Authentication cookies, launch nonces and waiting devices are deliberately not restored.
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createHash,
} from "node:crypto";
import { gzipSync } from "node:zlib";
import { loadEnvironment, connectionOptions } from "./tool-env.mjs";
loadEnvironment();
const tables = [
  "environment",
  "students",
  "adults",
  "permissions",
  "classes",
  "class_sessions",
  "roster",
  "events",
  "operations",
  "backups",
  "schema_migrations",
];
let db;
try {
  const pass = process.env.ART_BACKUP_PASSPHRASE;
  if (!pass || pass.length < 20)
    throw new Error(
      "Set ART_BACKUP_PASSPHRASE to a separate strong passphrase of at least 20 characters. Keep it in the owner's password manager.",
    );
  db = new pg.Client(connectionOptions());
  await db.connect();
  await db.query("begin isolation level repeatable read read only");
  const env = (await db.query("select * from art_checkin.environment")).rows[0];
  if (
    env.id !== process.env.ART_EXPECTED_DATABASE_ID ||
    env.kind !== process.env.ART_APP_MODE
  )
    throw new Error("Database identity mismatch.");
  const data = {};
  for (const table of tables)
    data[table] = (
      await db.query('select * from art_checkin."' + table + '"')
    ).rows;
  const grants = (
    await db.query(
      "select user_email,role,granted_at,granted_by from public.app_grants where app_slug='art-class-checkin'",
    )
  ).rows;
  const users = (
    await db.query(
      "select email,name from public.users where email in (select user_email from public.app_grants where app_slug='art-class-checkin')",
    )
  ).rows;
  await db.query("commit");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const paths = new Set(
    data.adults.flatMap((a) => (a.data.photoPath ? [a.data.photoPath] : [])),
  );
  // Audit / print snapshots may refer to older photos; include these too.
  for (const table of ["events", "backups"])
    for (const record of data[table]) {
      const visit = (value) => {
        if (!value || typeof value !== "object") return;
        if (typeof value.photoPath === "string") paths.add(value.photoPath);
        for (const child of Object.values(value)) visit(child);
      };
      visit(record);
    }
  const photos = [];
  for (const path of paths) {
    const { data: blob, error } = await supabase.storage
      .from("art-checkin-photos")
      .download(path);
    if (error || !blob)
      throw new Error(
        "A referenced private photo could not be backed up. Backup cancelled.",
      );
    photos.push({
      path,
      base64: Buffer.from(await blob.arrayBuffer()).toString("base64"),
    });
  }
  const migrations = readdirSync("supabase/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort()
    .map((name) => ({
      name,
      sql: readFileSync("supabase/migrations/" + name, "utf8"),
    }));
  const archive = {
    format: 1,
    createdAt: new Date().toISOString(),
    schemaVersion: env.schema_version,
    data,
    photos,
    accessReference: { grants, users },
    migrations,
  };
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = scryptSync(pass, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(gzipSync(Buffer.from(JSON.stringify(archive)))),
    cipher.final(),
  ]);
  const output = Buffer.concat([
    Buffer.from("ARTBKP01"),
    salt,
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]);
  mkdirSync("backups", { recursive: true });
  const name =
    "backups/art-checkin-" +
    new Date().toISOString().replaceAll(":", "-") +
    ".artbackup";
  writeFileSync(name, output, { mode: 0o600 });
  console.log("Encrypted app backup saved: " + name);
  console.log("SHA-256: " + createHash("sha256").update(output).digest("hex"));
  console.log(
    "Copy the encrypted file to the owner's protected backup location; retain the passphrase separately.",
  );
} catch (e) {
  console.error("Backup failed: " + e.message);
  process.exitCode = 1;
} finally {
  await db?.end();
}
