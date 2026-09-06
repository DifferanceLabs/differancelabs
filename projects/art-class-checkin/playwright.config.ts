import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 40000,
  use: {
    baseURL: process.env.ART_BROWSER_URL || "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "phone-webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "ipad-portrait-webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 820, height: 1180 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "ipad-landscape-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1180, height: 820 },
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.ART_BROWSER_URL
    ? undefined
    : {
        command: process.env.ART_BROWSER_BUILT
          ? "npm run preview"
          : "npm run dev",
        url: "http://localhost:5173/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});
