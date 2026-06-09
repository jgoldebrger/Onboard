import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isEmailVerified } from "@/lib/auth/email-verification";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ verified: isEmailVerified(user) });
}
