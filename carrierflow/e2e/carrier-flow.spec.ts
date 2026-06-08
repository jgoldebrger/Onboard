import { test, expect } from "@playwright/test";
import path from "node:path";
import { signUp, uniqueCarrierEmail } from "./helpers/auth";

test.describe("Carrier golden path", () => {
  test("register, interview, upload docs, submit for review", async ({
    page,
  }) => {
    const email = uniqueCarrierEmail();
    const password = "testpassword123";

    await signUp(page, email, password);
    await page.getByRole("link", { name: "Start onboarding" }).click();
    await page.waitForURL(/\/onboarding\/[^/]+$/);

    await expect(page.getByRole("heading", { name: "Interview" })).toBeVisible();

    const chatInput = page.getByLabel("Message");
    await chatInput.fill("broker");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/IN_PROGRESS|PENDING|DRAFT/)).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("link", { name: "Documents" }).click();
    await page.waitForURL(/\/documents$/);

    const fixturePath = path.join(__dirname, "fixtures", "sample.png");
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(page.getByText(/Upload received/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("link", { name: "Identity" }).click();
    await page.waitForURL(/\/identity$/);
    const dlInput = page.locator('input[name="dl"]');
    const selfieInput = page.locator('input[name="selfie"]');
    await dlInput.setInputFiles(fixturePath);
    await selfieInput.setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByText(/Manual review required/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("link", { name: "Interview" }).click();
    await page.waitForURL(/\/onboarding\/[^/]+$/);

    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText(/PENDING_REVIEW|submitted/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});
