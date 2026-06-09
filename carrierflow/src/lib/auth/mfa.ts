import { authenticator } from "otplib";
import type { User, UserRole } from "@prisma/client";
import { db } from "@/lib/db";

const ADMIN_ROLES = new Set<UserRole>(["ADMIN", "SUPER_ADMIN"]);

authenticator.options = { window: 1 };

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.has(role);
}

export function isAdminMfaRequired(): boolean {
  return process.env.REQUIRE_ADMIN_MFA !== "false";
}

export function adminNeedsMfaEnrollment(
  user: Pick<User, "role" | "mfaEnabled">,
): boolean {
  return isAdminRole(user.role) && isAdminMfaRequired() && !user.mfaEnabled;
}

export function generateMfaEnrollment(
  email: string,
): { secret: string; otpauthUrl: string } {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(email, "CarrierFlow", secret);
  return { secret, otpauthUrl };
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  return authenticator.verify({ token: normalized, secret });
}

export async function enrollMfaSecret(
  userId: string,
  secret: string,
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { mfaSecret: secret, mfaEnabled: false },
  });
}

export async function confirmMfaEnrollment(
  userId: string,
  code: string,
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.mfaSecret) return false;
  if (!verifyTotpCode(user.mfaSecret, code)) return false;

  await db.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  });
  return true;
}

export async function disableMfa(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { mfaSecret: null, mfaEnabled: false },
  });
}

export async function validateCredentialsWithMfa(params: {
  email: string;
  password: string;
  totp?: string;
}): Promise<
  | { status: "ok"; user: User }
  | { status: "invalid" }
  | { status: "mfa_required" }
  | { status: "mfa_invalid" }
> {
  const bcrypt = await import("bcryptjs");
  const user = await db.user.findUnique({
    where: { email: params.email.toLowerCase() },
  });
  if (!user?.passwordHash) return { status: "invalid" };

  const validPassword = await bcrypt.compare(
    params.password,
    user.passwordHash,
  );
  if (!validPassword) return { status: "invalid" };

  if (user.mfaEnabled) {
    if (!params.totp) return { status: "mfa_required" };
    if (!user.mfaSecret || !verifyTotpCode(user.mfaSecret, params.totp)) {
      return { status: "mfa_invalid" };
    }
  }

  return { status: "ok", user };
}
