import type { SaveResult } from "./types";
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public uncertain = false,
  ) {
    super(message);
  }
}
let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export function clearPrivateState() {
  csrf = "";
  sessionStorage.removeItem("art-pending");
}
export function pendingIds(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem("art-pending") || "[]");
  } catch {
    return [];
  }
}
function remember(id: string) {
  sessionStorage.setItem(
    "art-pending",
    JSON.stringify([...new Set([...pendingIds(), id])]),
  );
}
export function forget(id: string) {
  sessionStorage.setItem(
    "art-pending",
    JSON.stringify(pendingIds().filter((x) => x !== id)),
  );
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        "X-CSRF-Token": csrf,
        ...options.headers,
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new RequestError(
      0,
      "The server has not confirmed this change. Check the save status before retrying. Use the printed backup if the connection is unavailable.",
      true,
    );
  }
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: "The server could not confirm this request." }));
    throw new RequestError(response.status, body.error, response.status >= 500);
  }
  return response.json();
}
export async function change(
  action: string,
  input: unknown,
  operationId: string = crypto.randomUUID(),
): Promise<SaveResult> {
  remember(operationId);
  try {
    const result = await request<SaveResult>("/api/changes", {
      method: "POST",
      body: JSON.stringify({ action, input, operationId }),
    });
    forget(operationId);
    return result;
  } catch (error) {
    if (error instanceof RequestError && !error.uncertain) forget(operationId);
    throw error;
  }
}
export async function download(path: string): Promise<Blob> {
  let r: Response;
  try {
    r = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("Unable to download. Reconnect and try again.");
  }
  if (!r.ok)
    throw new Error(
      "The file could not be loaded. Sign in again if your session expired.",
    );
  return r.blob();
}
