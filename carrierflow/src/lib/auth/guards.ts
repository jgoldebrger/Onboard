import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { isEmailVerified } from "@/lib/auth/email-verification";
import { adminNeedsMfaEnrollment } from "@/lib/auth/mfa";

export function requireVerifiedEmail(user: User, returnTo?: string): void {
  if (isEmailVerified(user)) return;
  const query = returnTo
    ? `?returnTo=${encodeURIComponent(returnTo)}`
    : "";
  redirect(`/verify-email${query}`);
}

export function requireAdminMfaEnrolled(user: User): void {
  if (!adminNeedsMfaEnrollment(user)) return;
  redirect("/settings/security?required=1");
}
