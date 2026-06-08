import { NextResponse } from "next/server";
import { getSessionUser, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ applicationId: string }> };

async function assertAccess(applicationId: string, userId: string, role: Parameters<typeof hasPermission>[0]) {
  const app = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });
  if (!app) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (app.userId !== userId && !hasPermission(role, "applications:read")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const };
}

export async function GET(_req: Request, { params }: Params) {
  const { applicationId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await assertAccess(applicationId, user.id, user.role);
  if ("error" in access) return access.error;

  const identity = await db.identityVerification.findUnique({
    where: { applicationId },
  });

  if (!identity) {
    return NextResponse.json({ status: "PENDING", requiresHumanReview: true });
  }

  return NextResponse.json({
    status: identity.status,
    faceDetected: identity.faceDetected,
    match: identity.match,
    confidence: identity.confidence,
    requiresHumanReview: identity.requiresHumanReview,
  });
}
