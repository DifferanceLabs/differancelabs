import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

// The expanded studio is a fictional concept, available only in demo builds.
// Vite empties dist before this script, so live builds omit it entirely.
if (process.env.ART_APP_MODE === "demo") {
  const source = readFileSync("design/art-school-desk.html", "utf8");
  const styles = [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (styles.length !== 1 || scripts.length !== 1) {
    throw new Error("Expected one style and one script in the studio design.");
  }
  let body = source
    .replace(styles[0][0], "")
    .replace(scripts[0][0], "")
    // Decorative host icons are optional; the exported navigation keeps labels.
    .replace(/<i data-lucide="[^"]+" aria-hidden="true"><\/i>/g, "");
  const declarations = new Map();
  body = body.replace(/\bstyle="([^"]+)"/g, (_, declaration) => {
    if (!declarations.has(declaration)) {
      declarations.set(declaration, "space-" + declarations.size);
    }
    return 'data-sd-style="' + declarations.get(declaration) + '"';
  });
  const spacing = [...declarations].map(
    ([declaration, id]) =>
      '#art-school-desk [data-sd-style="' + id + '"]{' + declaration + "}",
  ).join("\n");
  const css = [
    '@import url("/fonts.css");',
    "html{background:#14201e;color-scheme:dark}body{margin:0;padding:12px;box-sizing:border-box}",
    "#art-school-desk{max-width:1100px;margin:0 auto}",
    "@media(max-width:620px){body{padding:0}#art-school-desk{border-radius:0}}",
    styles[0][1],
    spacing,
  ].join("\n");
  const html = [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow">',
    '<meta name="referrer" content="no-referrer">',
    '<meta name="theme-color" content="#14201e">',
    "<title>Art School Desk — design demo</title>",
    '<link rel="stylesheet" href="/studio-design/studio.css">',
    '</head><body><noscript>This fictional design needs JavaScript for its navigation.</noscript>',
    body,
    '<script src="/studio-design/studio.js"></script>',
    "</body></html>",
  ].join("\n");
  mkdirSync("dist/studio-design", { recursive: true });
  writeFileSync("dist/studio-design/index.html", html);
  writeFileSync("dist/studio-design/studio.css", css);
  writeFileSync("dist/studio-design/studio.js", scripts[0][1]);
}
