import { test, expect } from "@playwright/test";
import { signUp, uniqueCarrierEmail } from "./helpers/auth";
import {
  completeBrokerOnboardingChat,
  submitApplication,
} from "./helpers/onboarding";

test.describe("Carrier golden path", () => {
  test("register, complete onboarding chat, and submit for review", async ({
    page,
  }) => {
    const email = uniqueCarrierEmail();
    const password = "testpassword123";

    await signUp(page, email, password);
    await page.getByRole("link", { name: "Start onboarding" }).click();
    await page.waitForURL(/\/onboarding\/[^/]+$/);

    await completeBrokerOnboardingChat(page);
    await submitApplication(page);

    await expect(page.getByText(/PENDING REVIEW/i)).toBeVisible();
  });
});
