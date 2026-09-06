import { spawn } from "node:child_process";
import { loadEnvironment } from "./tool-env.mjs";
loadEnvironment();
if (process.env.ART_APP_MODE !== "demo")
  throw new Error(
    "The plain-HTTP local Netlify server requires fictional demo mode.",
  );
process.env.ART_APP_ORIGIN = "http://localhost:8888";
// Only fixed command text crosses the Windows shell. Private configuration is
// inherited through the environment and never interpolated into arguments.
const args = [
  "--yes",
  "netlify-cli@27.5.0",
  "dev",
  "--offline",
  "--no-open",
  "--skip-gitignore",
  "--functions",
  "netlify/functions",
  "--port",
  "8888",
];
const child =
  process.platform === "win32"
    ? spawn(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/s", "/c", "npx.cmd " + args.join(" ")],
        { stdio: "inherit" },
      )
    : spawn("npx", args, { stdio: "inherit" });
child.on("error", () => {
  console.error("Could not start the local Netlify CLI.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
