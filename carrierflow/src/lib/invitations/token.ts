import { createHmac, timingSafeEqual } from "crypto";

export type InvitePayload = {
  email: string;
  dotNumber?: string;
  mcNumber?: string;
  carrierTypeId?: string;
  companyName?: string;
  exp: number;
};

function secret(): string {
  const key = process.env.AUTH_SECRET?.trim();
  if (!key) throw new Error("AUTH_SECRET is required for invitations");
  return key;
}

function encode(payload: InvitePayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function decode(token: string): InvitePayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as InvitePayload;
    if (!payload.email || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createInviteToken(
  input: Omit<InvitePayload, "exp">,
  ttlDays = 14,
): string {
  return encode({
    ...input,
    email: input.email.toLowerCase(),
    exp: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
  });
}

export function verifyInviteToken(token: string): InvitePayload | null {
  return decode(token);
}

export function buildInviteUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/sign-up?invite=${encodeURIComponent(token)}`;
}
