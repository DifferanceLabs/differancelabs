import sharp from "sharp";
import { mkdirSync } from "node:fs";
mkdirSync("public/icons", { recursive: true });
const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#183d32"/><circle cx="256" cy="245" r="147" fill="#dcebb1"/><path d="M180 253l53 54 106-118" fill="none" stroke="#183d32" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><path d="M347 103l17-25M393 134l28-13" stroke="#dcebb1" stroke-width="15" stroke-linecap="round"/></svg>',
);
for (const size of [192, 512])
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile("public/icons/icon-" + size + ".png");
console.log("Home Screen icons generated.");
