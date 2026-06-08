import { NextResponse } from "next/server";
import { assessApplicationRisk } from "@/lib/agents/risk";
import { recommendApproval } from "@/lib/agents/approval";
import { getSessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { notifyCarrierOfStatusChange } from "@/lib/notify-carrier";
import { db } from "@/lib/db";
import { loadPublishedRules } from "@/lib/rules";
import type { RuleVersionSnapshot } from "@/types/domain";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const application = await db.onboardingApplication.findUnique({
    where: { id },
  });
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (application.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const published = await loadPublishedRules();
  const versionIds = [...new Set(published.map((r) => r.ruleVersionId))];
  const snapshot: RuleVersionSnapshot = {
    publishedRuleVersionIds: versionIds,
    capturedAt: new Date().toISOString(),
  };

  await db.onboardingApplication.update({
    where: { id },
    data: {
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
      ruleVersionSnapshot: snapshot,
    },
  });

  await assessApplicationRisk(id);
  const recommendation = await recommendApproval(id);

  await auditLog({
    actorId: user.id,
    entityType: "OnboardingApplication",
    entityId: id,
    action: "SUBMIT",
    after: { status: "PENDING_REVIEW", recommendation },
  });

  await notifyCarrierOfStatusChange(id, "PENDING_REVIEW");

  return NextResponse.json({
    status: "PENDING_REVIEW",
    recommendation,
  });
}
