import { test, expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  signIn,
  signUp,
  uniqueCarrierEmail,
} from "./helpers/auth";
import {
  completeBrokerOnboardingChat,
  submitApplication,
} from "./helpers/onboarding";

test.describe("Admin review", () => {
  test("admin approves a submitted application", async ({ page, browser }) => {
    const email = uniqueCarrierEmail();
    const password = "testpassword123";

    const carrierContext = await browser.newContext();
    const carrierPage = await carrierContext.newPage();

    await signUp(carrierPage, email, password);
    await carrierPage.getByRole("link", { name: "Start onboarding" }).click();
    await carrierPage.waitForURL(/\/onboarding\/[^/]+$/);

    await completeBrokerOnboardingChat(carrierPage);
    await submitApplication(carrierPage);

    await carrierContext.close();

    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole("link", { name: "Open admin dashboard" }).click();
    await page.waitForURL(/\/applications/);

    const row = page.locator("tr").filter({ hasText: email });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole("link", { name: "Open" }).click();
    await page.waitForURL(/\/carriers\/[^/]+$/);

    await expect(page.getByText("PENDING_REVIEW")).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("APPROVED")).toBeVisible({ timeout: 15_000 });
  });
});
