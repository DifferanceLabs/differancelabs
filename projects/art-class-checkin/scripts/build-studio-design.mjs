import { resolve } from "node:path";
import { build } from "vite";

// The class-day simulation has no backend and is published only in demo builds.
// The main Vite build empties dist first, so live builds omit it entirely.
if (process.env.ART_APP_MODE === "demo") {
  await build({
    configFile: false,
    root: resolve("design/simulation"),
    base: "/studio-design/",
    build: {
      outDir: resolve("dist/studio-design"),
      emptyOutDir: true,
      sourcemap: false,
    },
  });
}
