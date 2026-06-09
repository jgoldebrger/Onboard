import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@carrierflow.local";
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

async function leaveVerifyEmailIfNeeded(page: Page) {
  if (!page.url().includes("/verify-email")) return;

  const continueLink = page.getByRole("link", { name: "Continue" });
  if (await continueLink.isVisible().catch(() => false)) {
    await continueLink.click();
  } else {
    await page.goto("/");
  }

  await page.waitForURL((url) => !url.pathname.startsWith("/verify-email"));
}

export async function signUp(
  page: Page,
  email: string,
  password: string,
  companyName?: string,
) {
  await page.goto("/sign-up");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  if (companyName) {
    await page.getByLabel(/company name/i).fill(companyName);
  }
  await page.getByRole("button", { name: "Create account", exact: true }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/sign-up"), {
    timeout: 30_000,
  });

  await leaveVerifyEmailIfNeeded(page);

  await expect(
    page.getByRole("heading", { name: "Your onboarding hub" }),
  ).toBeVisible({ timeout: 15_000 });
}

export function uniqueCarrierEmail() {
  return `carrier-e2e-${Date.now()}@test.local`;
}
