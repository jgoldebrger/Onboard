import path from "node:path";
import { expect, type Page } from "@playwright/test";

const UPLOAD_BUTTON = /^Upload /;

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

function reviewProgressLocator(page: Page) {
  return page.getByRole("progressbar", { name: /Document review/i });
}

/** Wait until no document review progress bar is shown (chat is ready for upload). */
async function waitForNoActiveDocumentReview(page: Page) {
  await expect(reviewProgressLocator(page)).toBeHidden({ timeout: 120_000 });
}

/** After submit, the upload form is replaced by review progress until review finishes. */
async function waitForDocumentReviewComplete(page: Page) {
  const progress = reviewProgressLocator(page);
  await expect(progress).toBeVisible({ timeout: 30_000 });
  await expect(progress).toBeHidden({ timeout: 120_000 });
}

/**
 * Set file on the upload form and click submit, re-querying the button on each
 * attempt so a React re-render (review progress replacing the form) cannot
 * detach a stale locator mid-click.
 */
async function submitChatDocumentUpload(page: Page): Promise<string | null> {
  await waitForNoActiveDocumentReview(page);

  const firstUpload = page.getByRole("button", { name: UPLOAD_BUTTON }).first();
  if (!(await firstUpload.isVisible().catch(() => false))) {
    return null;
  }

  const label = ((await firstUpload.textContent()) ?? "Upload document").trim();

  for (let attempt = 0; attempt < 5; attempt++) {
    await waitForNoActiveDocumentReview(page);

    const uploadBtn = page.getByRole("button", { name: label, exact: true });
    await expect(uploadBtn).toBeVisible({ timeout: 10_000 });
    await expect(uploadBtn).toBeEnabled({ timeout: 10_000 });

    const fileInput = page
      .locator("form")
      .filter({ has: uploadBtn })
      .locator('input[name="file"]');
    await fileInput.setInputFiles(fixturePath);

    try {
      await uploadBtn.click({ force: false, timeout: 15_000 });
      return label;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const retriable =
        message.includes("detached") ||
        message.includes("not attached") ||
        message.includes("Target closed");
      if (!retriable || attempt === 4) throw err;
      await page.waitForTimeout(300);
    }
  }

  return null;
}

async function uploadAllChatDocuments(page: Page) {
  const identityBtn = page.getByRole("button", { name: "Submit identity verification" });
  const nextDocOrIdentity = page.getByRole("button", { name: UPLOAD_BUTTON }).or(identityBtn);

  await expect(page.getByRole("button", { name: UPLOAD_BUTTON }).first()).toBeVisible({
    timeout: 60_000,
  });

  for (let i = 0; i < 8; i++) {
    if (await identityBtn.isVisible().catch(() => false)) return;

    const label = await submitChatDocumentUpload(page);
    if (!label) {
      await expect(identityBtn).toBeVisible({ timeout: 120_000 });
      return;
    }

    await expect(page.getByRole("button", { name: label, exact: true })).toBeHidden({
      timeout: 60_000,
    });

    await waitForDocumentReviewComplete(page);
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
