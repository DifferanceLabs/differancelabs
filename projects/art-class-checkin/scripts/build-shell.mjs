import { readdirSync, writeFileSync } from "node:fs";
const assets = readdirSync("dist/assets")
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => "/assets/" + f);
const shell = [
  "/",
  "/index.html",
  "/launch.js",
  "/fonts.css",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  ...assets,
];
const version = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());
writeFileSync(
  "dist/sw.js",
  [
    "const CACHE=" + JSON.stringify("art-shell-" + version) + ";",
    "const SHELL=" + JSON.stringify(shell) + ";",
    "self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));",
    "self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('art-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));",
    "self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET'||url.pathname.startsWith('/api/'))return;",
    "if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));return;}",
    "if(SHELL.includes(url.pathname))event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));});",
  ].join("\n"),
);
