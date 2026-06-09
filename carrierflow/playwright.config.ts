import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : [["html", { open: "never" }]],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      CI: process.env.CI ?? "",
      PORT: String(port),
      AUTH_URL: baseURL,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-test-auth-secret",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:password@localhost:5432/carrierflow",
      DIRECT_URL:
        process.env.DIRECT_URL ??
        "postgresql://postgres:password@localhost:5432/carrierflow",
      STORAGE_PROVIDER: "local",
      LOCAL_STORAGE_PATH: ".data/e2e-uploads",
      SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? "changeme123",
      AUTO_VERIFY_EMAIL: "true",
    },
  },
});
