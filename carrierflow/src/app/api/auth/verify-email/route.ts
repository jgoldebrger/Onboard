import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth/email-verification";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  if (!token) {
    return NextResponse.redirect(
      `${appBase}/verify-email?status=missing`,
    );
  }

  const result = await verifyEmailToken(token);
  if (!result.ok) {
    return NextResponse.redirect(
      `${appBase}/verify-email?status=${result.reason}`,
    );
  }

  return NextResponse.redirect(`${appBase}/verify-email?status=success`);
}
