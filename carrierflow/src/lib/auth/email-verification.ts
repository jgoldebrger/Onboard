import { createHash, randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { sendTransactionalEmail } from "@/lib/email";
import { db } from "@/lib/db";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function isEmailVerified(user: Pick<User, "emailVerifiedAt">): boolean {
  return user.emailVerifiedAt != null;
}

export function shouldAutoVerifyEmail(): boolean {
  return process.env.AUTO_VERIFY_EMAIL === "true";
}

export async function markEmailVerified(userId: string): Promise<void> {
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    }),
    db.emailVerificationToken.deleteMany({ where: { userId } }),
  ]);
}

export async function createAndSendVerificationEmail(
  userId: string,
  email: string,
): Promise<{ sent: boolean }> {
  if (shouldAutoVerifyEmail()) {
    await markEmailVerified(userId);
    return { sent: false };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.emailVerificationToken.deleteMany({ where: { userId } });
  await db.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  const verifyUrl = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

  const result = await sendTransactionalEmail({
    to: email,
    subject: "Verify your CarrierFlow email",
    html: `
      <p>Hello,</p>
      <p>Thanks for signing up for CarrierFlow. Please verify your email to continue onboarding.</p>
      <p><a href="${verifyUrl}">Verify email address</a></p>
      <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
      <p>— CarrierFlow / Fabuwood</p>
    `,
  });

  return { sent: result.sent };
}

export async function verifyEmailToken(
  rawToken: string,
): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const tokenHash = hashToken(rawToken);
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return { ok: false, reason: "invalid" };
  }
  if (record.expiresAt < new Date()) {
    await db.emailVerificationToken.delete({ where: { id: record.id } });
    return { ok: false, reason: "expired" };
  }

  await markEmailVerified(record.userId);
  return { ok: true, userId: record.userId };
}

export async function resendVerificationEmail(
  userId: string,
): Promise<{ sent: boolean; error?: string }> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { sent: false, error: "User not found" };
  if (isEmailVerified(user)) return { sent: false, error: "Already verified" };

  const result = await createAndSendVerificationEmail(userId, user.email);
  return { sent: result.sent };
}
