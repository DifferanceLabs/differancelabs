import { app } from "../../server/app";

// Netlify supplies the client IP through trusted runtime context. Replace
// browser-supplied forwarding headers before the shared rate limiter reads it.
export default async function handler(
  request: Request,
  context: { ip: string; deploy?: { id: string } },
) {
  const headers = new Headers(request.headers);
  headers.set("x-vercel-forwarded-for", context.ip || "unknown");
  headers.delete("x-forwarded-for");
  const url = new URL(request.url);
  const functionPath = "/.netlify/functions/api";
  if (
    url.pathname === functionPath ||
    url.pathname.startsWith(functionPath + "/")
  )
    url.pathname = "/api" + url.pathname.slice(functionPath.length);
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    signal: request.signal,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  const response = await app.fetch(new Request(url, init), {
    deploymentVersion: context.deploy?.id
      ? "netlify:" + context.deploy.id
      : "local",
  });
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}
