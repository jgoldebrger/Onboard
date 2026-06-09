import path from "node:path";
import { expect, type Page } from "@playwright/test";

const fixturePath = path.join(__dirname, "../fixtures/sample.png");

/** Walk through unified onboarding chat: DOT → broker → questions → docs → identity. */
export async function completeBrokerOnboardingChat(page: Page) {
  const chatInput = page.getByLabel("Message");
  const sendButton = page.getByRole("button", { name: "Send" });

  await expect(page.getByRole("heading", { name: "Onboarding" })).toBeVisible({
    timeout: 20_000,
  });

  await chatInput.fill("9999999");
  await sendButton.click();
  await expect(page.getByText(/broker|carrier type|long-haul/i).first()).toBeVisible({
    timeout: 20_000,
  });

  await chatInput.fill("broker");
  await sendButton.click();

  for (const answer of ["E2E Transport LLC", "MC-123456", "yes"]) {
    await expect(chatInput).toBeVisible({ timeout: 20_000 });
    await chatInput.fill(answer);
    await sendButton.click();
  }

  await uploadAllChatDocuments(page);

  await expect(
    page.getByRole("button", { name: "Submit identity verification" }),
  ).toBeVisible({ timeout: 60_000 });

  await page.locator('input[name="dl"]').setInputFiles(fixturePath);
  await page.locator('input[name="selfie"]').setInputFiles(fixturePath);
  await page.getByRole("button", { name: "Submit identity verification" }).click();

  await expect(page.getByText(/All steps complete/i)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "Submit application" })).toBeEnabled({
    timeout: 15_000,
  });
}

async function uploadAllChatDocuments(page: Page) {
  const uploadPattern = /^Upload /;
  const identityBtn = page.getByRole("button", { name: "Submit identity verification" });
  const nextDocOrIdentity = page
    .getByRole("button", { name: uploadPattern })
    .or(identityBtn);

  await expect(page.getByRole("button", { name: uploadPattern }).first()).toBeVisible({
    timeout: 60_000,
  });

  for (let i = 0; i < 8; i++) {
    if (await identityBtn.isVisible().catch(() => false)) return;

    const uploadBtn = page.getByRole("button", { name: uploadPattern }).first();
    if (!(await uploadBtn.isVisible().catch(() => false))) {
      await expect(identityBtn).toBeVisible({ timeout: 120_000 });
      return;
    }

    const label = (await uploadBtn.textContent()) ?? `Upload document ${i + 1}`;
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await uploadBtn.click();
    await expect(page.getByRole("button", { name: label, exact: true })).toBeHidden({
      timeout: 60_000,
    });

    // Document review is async (inline in CI); wait for chat to advance.
    await expect(nextDocOrIdentity.first()).toBeVisible({ timeout: 120_000 });
  }
}

export async function submitApplication(page: Page) {
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(
    page.getByText(/Application submitted successfully/i),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Submitted" })).toBeVisible();
}
