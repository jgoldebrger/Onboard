import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  enrollMfaSecret,
  generateMfaEnrollment,
  isAdminRole,
} from "@/lib/auth/mfa";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = user.email;
  const { secret, otpauthUrl } = generateMfaEnrollment(email);

  await enrollMfaSecret(user.id, secret);

  return NextResponse.json({
    secret,
    otpauthUrl,
  });
}
