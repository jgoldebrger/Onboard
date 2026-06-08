import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../_utils";

const updateSchema = z.object({
  slug: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  partnerTypeId: z.string().min(1).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("config:manage");
    const { id } = await params;
    const carrierType = await db.carrierType.findUnique({
      where: { id },
      include: {
        partnerType: { select: { id: true, name: true, slug: true } },
        questions: {
          include: { question: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!carrierType) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(carrierType);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("config:manage");
    const { id } = await params;
    const before = await db.carrierType.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = updateSchema.parse(await req.json());
    const updated = await db.carrierType.update({
      where: { id },
      data: {
        ...body,
        version: { increment: 1 },
      },
      include: { partnerType: { select: { id: true, name: true, slug: true } } },
    });
    await auditLog({
      actorId: user.id,
      entityType: "carrier_type",
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
    const before = await db.carrierType.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const appCount = await db.onboardingApplication.count({
      where: { carrierTypeId: id },
    });
    if (appCount > 0) {
      return NextResponse.json(
        { error: "Carrier type is in use by applications" },
        { status: 409 },
      );
    }
    await db.carrierType.delete({ where: { id } });
    await auditLog({
      actorId: user.id,
      entityType: "carrier_type",
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
