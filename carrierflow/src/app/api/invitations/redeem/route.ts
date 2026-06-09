import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { redeemInviteForUser } from "@/lib/invitations/redeem";

const bodySchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const result = await redeemInviteForUser(user.id, body.data.token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    applicationId: result.applicationId,
    redirectTo: `/onboarding/${result.applicationId}`,
  });
}
