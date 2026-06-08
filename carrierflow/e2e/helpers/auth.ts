import type { Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@carrierflow.local";
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

export async function signUp(
  page: Page,
  email: string,
  password: string,
  companyName?: string,
) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  if (companyName) {
    await page.getByLabel(/company name/i).fill(companyName);
  }
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-up"));
}

export function uniqueCarrierEmail() {
  return `carrier-e2e-${Date.now()}@test.local`;
}
