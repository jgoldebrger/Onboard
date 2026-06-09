import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resendVerificationEmail } from "@/lib/auth/email-verification";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await resendVerificationEmail(userId);
  if (result.error === "Already verified") {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, sent: result.sent });
}
