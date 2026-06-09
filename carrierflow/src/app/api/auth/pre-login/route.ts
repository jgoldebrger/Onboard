import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCredentialsWithMfa } from "@/lib/auth/mfa";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const result = await validateCredentialsWithMfa({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (result.status === "invalid") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (result.status === "mfa_required") {
    return NextResponse.json({ mfaRequired: true });
  }

  return NextResponse.json({ mfaRequired: false });
}
