import pg from "pg";
import { readFileSync } from "node:fs";
import { applyMigrations } from "./migration-lib.mjs";
import {
  loadEnvironment,
  connectionOptions,
  saveEnvironmentValue,
} from "./tool-env.mjs";
import { seedDemo } from "./demo-seed.mjs";
loadEnvironment();
let db;
try {
  const mode = process.env.ART_APP_MODE;
  if (!["demo", "live"].includes(mode))
    throw new Error(
      "Choose ART_APP_MODE=demo or live in the private environment file.",
    );
  if (mode === "live" && !process.argv.includes("--approved-production"))
    throw new Error(
      "Production migration not applied. Obtain the explicit AGENTS.md approval first, then use --approved-production.",
    );
  db = new pg.Client(connectionOptions());
  await db.connect();
  const exists = (
    await db.query("select to_regclass('art_checkin.environment') as t")
  ).rows[0].t;
  if (exists) {
    const e = (await db.query("select id,kind from art_checkin.environment"))
      .rows[0];
    if (e.id !== process.env.ART_EXPECTED_DATABASE_ID || e.kind !== mode)
      throw new Error("Database identity/mode mismatch. No migration applied.");
  } else if (mode === "demo") {
    const tables = (
      await db.query(
        "select count(*)::int n from pg_tables where schemaname='public'",
      )
    ).rows[0].n;
    if (tables !== 0)
      throw new Error(
        "A new cloud demo requires an empty, separate project; existing public tables were found.",
      );
    await db.query(readFileSync("supabase/fixtures/demo_access.sql", "utf8"));
  } else {
    for (const table of ["apps", "app_grants", "users"]) {
      if (
        !(await db.query("select to_regclass($1) as t", ["public." + table]))
          .rows[0].t
      )
        throw new Error(
          "The live app requires the existing Differance Labs access database.",
        );
    }
  }
  await applyMigrations(db);
  if (!exists) {
    await db.query("update art_checkin.environment set kind=$1", [mode]);
    if (mode === "demo") await seedDemo(db);
  }
  const identity = (await db.query("select id from art_checkin.environment"))
    .rows[0].id;
  saveEnvironmentValue("ART_EXPECTED_DATABASE_ID", identity);
  console.log(
    "Database prepared. The identity was saved privately to the selected environment file. Copy it securely into this app's matching Vercel environment.",
  );
} catch (e) {
  console.error("Migration stopped: " + e.message);
  process.exitCode = 1;
} finally {
  await db?.end();
}
