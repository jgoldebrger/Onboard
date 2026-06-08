import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { notifyCarrierOfStatusChange } from "@/lib/notify-carrier";
import { db } from "@/lib/db";
import { handleApiError, clientIp } from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("applications:approve");
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { notes?: string };

    const before = await db.onboardingApplication.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.onboardingApplication.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    await db.approvalLog.create({
      data: {
        applicationId: id,
        actorId: user.id,
        action: "APPROVE",
        notes: body.notes,
      },
    });

    await auditLog({
      actorId: user.id,
      entityType: "OnboardingApplication",
      entityId: id,
      action: "APPROVE",
      before: { status: before.status },
      after: { status: updated.status },
      ipAddress: clientIp(req),
    });

    await notifyCarrierOfStatusChange(id, "APPROVED", body.notes);

    return NextResponse.json({ status: updated.status });
  } catch (err) {
    return handleApiError(err);
  }
}
