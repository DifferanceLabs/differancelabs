import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app";
import { readFileSync } from "node:fs";
if (process.argv.includes("--built")) {
  const headers = JSON.parse(readFileSync("vercel.json", "utf8")).headers[0]
    .headers as { key: string; value: string }[];
  app.use("/*", async (c, next) => {
    for (const header of headers) c.header(header.key, header.value);
    await next();
  });
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}
const port = process.argv.includes("--built") ? 5173 : 5174;
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });
console.log("Art server running locally on port " + port + ".");
