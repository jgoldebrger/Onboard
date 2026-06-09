import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isDisposableEmail } from "@/lib/fraud/disposable-email";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().optional(),
});

const registrationAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = registrationAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    registrationAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password (min 8 characters)" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  if (isDisposableEmail(email)) {
    return NextResponse.json(
      { error: "Please use a business email address" },
      { status: 400 },
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      role: "CARRIER",
      companyName: parsed.data.companyName,
    },
  });

  return NextResponse.json({ ok: true });
}
