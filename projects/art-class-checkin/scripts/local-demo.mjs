import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import pg from "pg";
import { seedDemo } from "./demo-seed.mjs";
import { applyMigrations } from "./migration-lib.mjs";
function cli(args) {
  return execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    },
  );
}
try {
  console.log(
    "Starting the isolated local Supabase services (Docker images may take several minutes).",
  );
  cli([
    "start",
    "-x",
    "studio,realtime,inbucket,imgproxy,edge-runtime,logflare,vector,supavisor",
  ]);
  const local = JSON.parse(cli(["status", "-o", "json"]));
  const dbUrl = new URL(local.DB_URL);
  if (
    !["127.0.0.1", "localhost"].includes(dbUrl.hostname) ||
    dbUrl.port !== "55322"
  )
    throw new Error("Unexpected local database target.");
  const db = new pg.Client({ connectionString: local.DB_URL });
  await db.connect();
  const {
    rows: [present],
  } = await db.query(
    "select to_regclass('art_checkin.environment') as existing",
  );
  if (!present.existing) {
    await db.query(readFileSync("supabase/fixtures/demo_access.sql", "utf8"));
    await applyMigrations(db);
    await db.query("update art_checkin.environment set kind='demo'");
    await seedDemo(db);
  } else {
    await applyMigrations(db);
    if (process.argv.includes("--reset")) await seedDemo(db);
  }
  const {
    rows: [env],
  } = await db.query("select id,kind from art_checkin.environment");
  if (env.kind !== "demo") throw new Error("The local database is not a demo.");
  writeFileSync(
    ".env.local",
    [
      "ART_APP_MODE=demo",
      "ART_APP_ORIGIN=http://localhost:5173",
      "ART_EXPECTED_DATABASE_ID=" + env.id,
      "DL_PORTAL_ORIGIN=https://www.differancelabs.com",
      "SUPABASE_URL=" + local.API_URL,
      "SUPABASE_SERVICE_ROLE_KEY=" + local.SERVICE_ROLE_KEY,
      "ART_MIGRATION_DATABASE_URL=" + local.DB_URL,
    ].join("\n") + "\n",
    { mode: 0o600 },
  );
  await db.query("notify pgrst, 'reload schema'");
  await db.end();
  console.log(
    "Local fictional demo is ready. Run npm.cmd run dev, then open http://localhost:5173 on this Windows computer.",
  );
} catch (e) {
  // CLI output can contain keys and URLs. Do not echo it.
  console.error(
    "Local setup failed: " +
      (e.stderr
        ? "Docker/Supabase command failed. Check Docker Desktop and the local Supabase containers."
        : e.message),
  );
  process.exitCode = 1;
}
