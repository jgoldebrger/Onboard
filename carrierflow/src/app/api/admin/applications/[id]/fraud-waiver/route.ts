import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { assessApplicationFraud } from "@/lib/fraud";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../../_utils";

const bodySchema = z.object({
  reason: z.string().min(1).max(2000),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("applications:override");
    const { id: applicationId } = await params;
    const body = bodySchema.parse(await req.json());

    const application = await db.onboardingApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (application.fraudWaiverAt) {
      return NextResponse.json(
        { error: "Fraud waiver already recorded for this application" },
        { status: 409 },
      );
    }

    const fraud = await assessApplicationFraud(applicationId, {
      ignoreWaiver: true,
    });
    if (!fraud.blockOnboarding) {
      return NextResponse.json(
        { error: "Application is not blocked by fraud signals" },
        { status: 400 },
      );
    }

    const before = {
      fraudWaiverAt: application.fraudWaiverAt,
      fraudWaiverReason: application.fraudWaiverReason,
    };

    const updated = await db.onboardingApplication.update({
      where: { id: applicationId },
      data: {
        fraudWaiverReason: body.reason,
        fraudWaiverAt: new Date(),
        fraudWaiverById: user.id,
        fraudWaiverScore: fraud.score,
        fraudWaiverLevel: fraud.level,
      },
    });

    await db.approvalLog.create({
      data: {
        applicationId,
        actorId: user.id,
        action: "FRAUD_WAIVE",
        notes: body.reason,
        metadata: {
          fraudScore: fraud.score,
          fraudLevel: fraud.level,
          signals: fraud.signals.map((s) => s.key),
        },
      },
    });

    await auditLog({
      actorId: user.id,
      entityType: "OnboardingApplication",
      entityId: applicationId,
      action: "FRAUD_WAIVE",
      before,
      after: {
        fraudWaiverAt: updated.fraudWaiverAt?.toISOString(),
        fraudWaiverReason: updated.fraudWaiverReason,
        fraudScore: fraud.score,
        fraudLevel: fraud.level,
        reason: body.reason,
      },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({
      ok: true,
      fraudScore: fraud.score,
      fraudLevel: fraud.level,
      waivedAt: updated.fraudWaiverAt?.toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
