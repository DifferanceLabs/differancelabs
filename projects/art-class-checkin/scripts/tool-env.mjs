import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
export const envPath = process.env.ART_ENV_FILE || ".env.local";
export function loadEnvironment() {
  if (existsSync(envPath))
    Object.assign(process.env, parseEnv(readFileSync(envPath, "utf8")));
}
export function saveEnvironmentValue(name, value) {
  const lines = existsSync(envPath)
    ? readFileSync(envPath, "utf8").split(/\r?\n/)
    : [];
  const updated = lines.filter((line) => !line.startsWith(name + "="));
  updated.push(name + "=" + value);
  writeFileSync(envPath, updated.join("\n") + "\n", { mode: 0o600 });
}
export function connectionOptions() {
  const connectionString = process.env.ART_MIGRATION_DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "ART_MIGRATION_DATABASE_URL is required in the private environment file.",
    );
  const url = new URL(connectionString),
    local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (!local && url.protocol !== "postgresql:" && url.protocol !== "postgres:")
    throw new Error("Expected a PostgreSQL connection.");
  // Cloud connections must validate TLS. Do not add rejectUnauthorized:false.
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    url.searchParams.delete(key);
  const ca = process.env.ART_DATABASE_CA_PATH
    ? readFileSync(process.env.ART_DATABASE_CA_PATH, "utf8")
    : undefined;
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}
