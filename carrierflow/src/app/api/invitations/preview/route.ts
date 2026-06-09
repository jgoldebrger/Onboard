import { NextResponse } from "next/server";
import { verifyInviteToken } from "@/lib/invitations/token";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const payload = verifyInviteToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    email: payload.email,
    dotNumber: payload.dotNumber ?? null,
    mcNumber: payload.mcNumber ?? null,
    companyName: payload.companyName ?? null,
  });
}
