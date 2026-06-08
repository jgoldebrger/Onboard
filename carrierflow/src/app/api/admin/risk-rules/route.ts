import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../_utils";

const createSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(256),
  points: z.number().int(),
  condition: z.unknown(),
  isEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    await requirePermission("config:manage");
    const riskRules = await db.riskRule.findMany({
      orderBy: { key: "asc" },
    });
    return NextResponse.json(riskRules);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission("config:manage");
    const body = createSchema.parse(await req.json());
    const created = await db.riskRule.create({
      data: {
        key: body.key,
        label: body.label,
        points: body.points,
        condition: body.condition as object,
        isEnabled: body.isEnabled ?? true,
      },
    });
    await auditLog({
      actorId: user.id,
      entityType: "risk_rule",
      entityId: created.id,
      action: "create",
      after: created,
      ipAddress: clientIp(req),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    return handleApiError(err);
  }
}
