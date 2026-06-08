import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../../_utils";

const bodySchema = z.object({
  entityType: z.enum(["document_review", "rule", "identity"]),
  entityId: z.string().min(1),
  reason: z.string().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

    let before: unknown;
    let after: unknown;

    if (body.entityType === "document_review") {
      const review = await db.documentReview.findFirst({
        where: {
          id: body.entityId,
          document: { applicationId },
        },
        include: { document: true },
      });
      if (!review) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 });
      }
      before = { status: review.status, failureReasons: review.failureReasons };
      const updated = await db.documentReview.update({
        where: { id: review.id },
        data: {
          status: "PASSED",
          failureReasons: [],
          ruleResults: [
            ...(Array.isArray(review.ruleResults)
              ? (review.ruleResults as object[])
              : []),
            { rule: "admin_override", passed: true, message: body.reason },
          ] as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });
      after = { status: updated.status, overridden: true };
    } else if (body.entityType === "identity") {
      const identity = await db.identityVerification.findFirst({
        where: { id: body.entityId, applicationId },
      });
      if (!identity) {
        return NextResponse.json({ error: "Identity not found" }, { status: 404 });
      }
      before = { status: identity.status, requiresHumanReview: identity.requiresHumanReview };
      const updated = await db.identityVerification.update({
        where: { id: identity.id },
        data: {
          status: "PASSED",
          requiresHumanReview: false,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });
      after = { status: updated.status, requiresHumanReview: updated.requiresHumanReview };
    } else {
      return NextResponse.json(
        { error: "Rule override not implemented in Phase 1" },
        { status: 501 },
      );
    }

    await db.approvalLog.create({
      data: {
        applicationId,
        actorId: user.id,
        action: "OVERRIDE_RULE",
        notes: body.reason,
        metadata: {
          entityType: body.entityType,
          entityId: body.entityId,
          ...body.metadata,
        },
      },
    });

    await auditLog({
      actorId: user.id,
      entityType: body.entityType,
      entityId: body.entityId,
      action: "OVERRIDE",
      before,
      after,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ ok: true, after });
  } catch (err) {
    return handleApiError(err);
  }
}
