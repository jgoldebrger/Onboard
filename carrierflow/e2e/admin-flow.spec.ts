import { test, expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  signIn,
  signUp,
  uniqueCarrierEmail,
} from "./helpers/auth";

test.describe("Admin review", () => {
  test("admin approves a submitted application", async ({ page, browser }) => {
    const email = uniqueCarrierEmail();
    const password = "testpassword123";

    const carrierContext = await browser.newContext();
    const carrierPage = await carrierContext.newPage();

    await signUp(carrierPage, email, password);
    await carrierPage.getByRole("link", { name: "Start onboarding" }).click();
    await carrierPage.waitForURL(/\/onboarding\/[^/]+$/);

    const chatInput = carrierPage.getByLabel("Message");
    await chatInput.fill("broker");
    await carrierPage.getByRole("button", { name: "Send" }).click();
    await carrierPage.getByRole("button", { name: "Submit application" }).click();
    await expect(carrierPage.getByText(/PENDING_REVIEW|submitted/i)).toBeVisible({
      timeout: 20_000,
    });

    await carrierContext.close();

    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole("link", { name: "Open admin dashboard" }).click();
    await page.waitForURL(/\/applications/);

    const row = page.locator("tr").filter({ hasText: email });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole("link", { name: "Review" }).click();
    await page.waitForURL(/\/applications\/[^/]+$/);

    await expect(page.getByText("PENDING_REVIEW")).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("APPROVED")).toBeVisible({ timeout: 15_000 });
  });
});
