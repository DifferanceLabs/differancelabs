import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/simulation-browser",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  outputDir: "test-results/simulation",
  use: {
    actionTimeout: 12000,
    baseURL: process.env.ART_SIMULATION_URL || "http://127.0.0.1:5176",
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
  webServer: process.env.ART_SIMULATION_URL
    ? undefined
    : {
        command: "node scripts/serve-simulation.mjs",
        url: "http://127.0.0.1:5176/studio-design",
        reuseExistingServer: false,
        timeout: 30000,
      },
});
