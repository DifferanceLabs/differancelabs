// Restore only into an EMPTY, separately provisioned recovery app schema.
// This cannot overwrite a live app or existing attendance / grant records.
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { scryptSync, createDecipheriv } from "node:crypto";
import { gunzipSync } from "node:zlib";
import {
  loadEnvironment,
  connectionOptions,
  saveEnvironmentValue,
} from "./tool-env.mjs";
loadEnvironment();
let db;
try {
  const file = process.argv[2],
    pass = process.env.ART_BACKUP_PASSPHRASE;
  if (!file || !pass)
    throw new Error(
      "Use npm.cmd run restore -- PATH.artbackup with ART_BACKUP_PASSPHRASE set privately.",
    );
  const bytes = readFileSync(file);
  if (bytes.subarray(0, 8).toString() !== "ARTBKP01")
    throw new Error("Unrecognized archive.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    scryptSync(pass, bytes.subarray(8, 24), 32),
    bytes.subarray(24, 36),
  );
  decipher.setAuthTag(bytes.subarray(36, 52));
  const archive = JSON.parse(
    gunzipSync(
      Buffer.concat([decipher.update(bytes.subarray(52)), decipher.final()]),
    ).toString(),
  );
  if (archive.format !== 1 || archive.schemaVersion !== 1)
    throw new Error("Use the compatible app version to restore this archive.");
  db = new pg.Client(connectionOptions());
  await db.connect();
  if (
    !(await db.query("select to_regclass('art_checkin.environment') as t"))
      .rows[0].t
  )
    throw new Error(
      "Prepare the EMPTY recovery schema using the matching migrations first.",
    );
  const env = (await db.query("select * from art_checkin.environment")).rows[0];
  if (
    env.id !== process.env.ART_EXPECTED_DATABASE_ID ||
    env.id === archive.data.environment[0].id
  )
    throw new Error(
      "Restore requires a different, explicitly selected recovery database.",
    );
  if (env.kind !== "live" || process.env.ART_APP_MODE !== "live")
    throw new Error(
      "Recovery uses locked live-mode authentication; demo login is forbidden for restored records.",
    );
  for (const t of [
    "students",
    "events",
    "adults",
    "permissions",
    "classes",
    "class_sessions",
    "roster",
    "operations",
    "backups",
  ]) {
    if (
      (await db.query('select count(*)::int n from art_checkin."' + t + '"'))
        .rows[0].n
    )
      throw new Error("Recovery schema is not empty. No records overwritten.");
  }
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  for (const photo of archive.photos) {
    const { error } = await client.storage
      .from("art-checkin-photos")
      .upload(photo.path, Buffer.from(photo.base64, "base64"), {
        contentType: "image/webp",
        upsert: false,
      });
    if (error && !error.message?.includes("already exists"))
      throw new Error(
        "Photo recovery failed; fix the private storage project before retrying.",
      );
  }
  await db.query("begin");
  try {
    for (const t of [
      "students",
      "adults",
      "permissions",
      "classes",
      "class_sessions",
      "roster",
      "events",
      "operations",
      "backups",
    ]) {
      for (const row of archive.data[t]) {
        const keys = Object.keys(row),
          values = keys.map((k) =>
            row[k] !== null && typeof row[k] === "object"
              ? JSON.stringify(row[k])
              : row[k],
          );
        await db.query(
          'insert into art_checkin."' +
            t +
            '" (' +
            keys.map((k) => '"' + k + '"').join(",") +
            ") values (" +
            keys.map((_, i) => "$" + (i + 1)).join(",") +
            ")",
          values,
        );
      }
    }
    await db.query(
      "update art_checkin.environment set business_name=$1,timezone=$2",
      [
        archive.data.environment[0].business_name,
        archive.data.environment[0].timezone,
      ],
    );
    await db.query(
      "select setval(pg_get_serial_sequence('art_checkin.events','sequence'),greatest(coalesce((select max(sequence) from art_checkin.events),1),1))",
    );
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
  saveEnvironmentValue("ART_EXPECTED_DATABASE_ID", env.id);
  console.log(
    "App records and referenced private photos restored into the isolated recovery schema.",
  );
  console.log(
    "Sessions and access grants were NOT restored. Review staff access explicitly, verify records and photos, then approve any production cutover.",
  );
} catch (e) {
  console.error("Restore stopped: " + e.message);
  process.exitCode = 1;
} finally {
  await db?.end();
}
