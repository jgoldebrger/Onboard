import { test, expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  signIn,
  signUp,
  uniqueCarrierEmail,
} from "./helpers/auth";

test.describe("Authentication", () => {
  test("admin can sign in and reach home", async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(
      page.getByRole("heading", { name: "Operations dashboard" }),
    ).toBeVisible();
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open admin dashboard" }),
    ).toBeVisible();
  });

  test("carrier can register and sign out", async ({ page }) => {
    const email = uniqueCarrierEmail();
    const password = "testpassword123";

    await signUp(page, email, password, "E2E Transport LLC");
    await expect(
      page.getByRole("heading", { name: "Your onboarding hub" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/sign-in/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
