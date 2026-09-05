import { createClient } from "@supabase/supabase-js";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function database() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ApiError(503, "The app database is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
}
export async function rpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await database().rpc(fn, args);
  if (error) {
    const status = error.code?.startsWith("PT")
      ? Number(error.code.slice(2))
      : error.code === "23503"
        ? 422
        : 503;
    throw new ApiError(
      status,
      status === 503
        ? "The server could not confirm the save. Check its status before trying again; use the paper backup if offline."
        : error.code === "23503"
          ? "A linked record no longer exists. Reload and try again."
          : error.message,
    );
  }
  return data as T;
}
export async function assertEnvironment() {
  const mode = process.env.ART_APP_MODE;
  if (
    !["live", "demo"].includes(mode || "") ||
    !process.env.ART_EXPECTED_DATABASE_ID
  )
    throw new ApiError(503, "The app environment is not configured.");
  const e = await rpc<{ id: string; kind: string }>("art_identity");
  if (e.id !== process.env.ART_EXPECTED_DATABASE_ID || e.kind !== mode)
    throw new ApiError(
      503,
      "Database environment mismatch. Access is disabled.",
    );
  return e;
}
