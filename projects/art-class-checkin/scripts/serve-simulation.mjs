import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

// Dedicated test server: static fictional assets, same CSP as Vercel, no API.
process.env.ART_APP_MODE = "demo";
await import("./build-studio-design.mjs");
const dist = resolve("dist");
const config = JSON.parse(await readFile("vercel.json", "utf8"));
const headers = Object.fromEntries(
  config.headers[0].headers.map((h) => [h.key, h.value]),
);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
createServer(async (request, response) => {
  let path = new URL(request.url, "http://localhost").pathname;
  if (path === "/studio-design" || path === "/studio-design/")
    path = "/studio-design/index.html";
  const file = resolve(dist, "." + path);
  if (
    request.method !== "GET" ||
    !file.startsWith(dist + sep) ||
    !path.startsWith("/studio-design/")
  ) {
    response.writeHead(404, headers);
    response.end("No API in the simulation");
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      ...headers,
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, headers);
    response.end("Not found");
  }
}).listen(5176, "127.0.0.1", () =>
  console.log(
    "Fictional class simulation at http://127.0.0.1:5176/studio-design",
  ),
);
