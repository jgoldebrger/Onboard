import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { confirmMfaEnrollment, isAdminRole } from "@/lib/auth/mfa";

const schema = z.object({
  code: z.string().min(6).max(8),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const ok = await confirmMfaEnrollment(user.id, parsed.data.code);
  if (!ok) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
