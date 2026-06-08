import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../_utils";

const updateSchema = z.object({
  key: z.string().min(1).max(64).optional(),
  label: z.string().min(1).max(256).optional(),
  points: z.number().int().optional(),
  condition: z.unknown().optional(),
  isEnabled: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("config:manage");
    const { id } = await params;
    const riskRule = await db.riskRule.findUnique({ where: { id } });
    if (!riskRule) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(riskRule);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("config:manage");
    const { id } = await params;
    const before = await db.riskRule.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = updateSchema.parse(await req.json());
    const updated = await db.riskRule.update({
      where: { id },
      data: {
        key: body.key,
        label: body.label,
        points: body.points,
        condition:
          body.condition !== undefined
            ? (body.condition as object)
            : undefined,
        isEnabled: body.isEnabled,
      },
    });
    await auditLog({
      actorId: user.id,
      entityType: "risk_rule",
      entityId: id,
      action: "update",
      before,
      after: updated,
      ipAddress: clientIp(req),
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("config:manage");
    const { id } = await params;
    const before = await db.riskRule.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.riskRule.delete({ where: { id } });
    await auditLog({
      actorId: user.id,
      entityType: "risk_rule",
      entityId: id,
      action: "delete",
      before,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
