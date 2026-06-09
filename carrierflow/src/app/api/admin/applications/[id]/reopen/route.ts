import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { notifyCarrierOfStatusChange } from "@/lib/notify-carrier";
import { emitWebhookEvent } from "@/lib/webhooks";
import { db } from "@/lib/db";
import { handleApiError, clientIp } from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  reason: z.string().min(1).max(2000),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("applications:approve");
    const { id } = await params;
    const body = bodySchema.parse(await req.json());

    const before = await db.onboardingApplication.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!["REJECTED", "NEEDS_INFO"].includes(before.status)) {
      return NextResponse.json(
        { error: "Only rejected or needs-info applications can be reopened." },
        { status: 400 },
      );
    }

    const updated = await db.onboardingApplication.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    await db.approvalLog.create({
      data: {
        applicationId: id,
        actorId: user.id,
        action: "REOPEN",
        notes: body.reason,
      },
    });

    await auditLog({
      actorId: user.id,
      entityType: "OnboardingApplication",
      entityId: id,
      action: "REOPEN",
      before: { status: before.status },
      after: { status: updated.status, reason: body.reason },
      ipAddress: clientIp(req),
    });

    await notifyCarrierOfStatusChange(id, "IN_PROGRESS", body.reason);
    void emitWebhookEvent("application.reopened", {
      applicationId: id,
      previousStatus: before.status,
      status: updated.status,
      reason: body.reason,
    });

    return NextResponse.json({ status: updated.status });
  } catch (err) {
    return handleApiError(err);
  }
}
