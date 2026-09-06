import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
export async function applyMigrations(db) {
  await db.query("select pg_advisory_lock(845719204)");
  try {
    const hasLedger = (
      await db.query("select to_regclass('art_checkin.schema_migrations') as t")
    ).rows[0].t;
    const applied = hasLedger
      ? (await db.query("select * from art_checkin.schema_migrations")).rows
      : [];
    for (const name of readdirSync("supabase/migrations")
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const sql = readFileSync("supabase/migrations/" + name, "utf8"),
        checksum = createHash("sha256")
          .update(sql.replaceAll("\r\n", "\n"))
          .digest("hex"),
        previous = applied.find((x) => x.name === name);
      if (previous) {
        if (previous.checksum !== checksum)
          throw new Error(
            "An applied migration changed: " +
              name +
              ". Create an additive migration; do not overwrite history.",
          );
        continue;
      }
      await db.query("begin");
      try {
        await db.query(sql);
        await db.query(
          "create table if not exists art_checkin.schema_migrations(name text primary key,checksum text not null,applied_at timestamptz not null default now())",
        );
        await db.query(
          "alter table art_checkin.schema_migrations enable row level security",
        );
        await db.query(
          "revoke all on art_checkin.schema_migrations from public,anon,authenticated,service_role",
        );
        await db.query(
          "insert into art_checkin.schema_migrations(name,checksum) values($1,$2)",
          [name, checksum],
        );
        await db.query("commit");
        console.log("Applied " + name);
      } catch (error) {
        await db.query("rollback");
        throw error;
      }
    }
    await db.query("notify pgrst, 'reload schema'");
  } finally {
    await db.query("select pg_advisory_unlock(845719204)");
  }
}
