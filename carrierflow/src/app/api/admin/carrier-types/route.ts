import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../_utils";

const createSchema = z.object({
  partnerTypeId: z.string().min(1),
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requirePermission("config:manage");
    const carrierTypes = await db.carrierType.findMany({
      include: { partnerType: { select: { id: true, name: true, slug: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(carrierTypes);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission("config:manage");
    const body = createSchema.parse(await req.json());
    const created = await db.carrierType.create({
      data: {
        partnerTypeId: body.partnerTypeId,
        slug: body.slug,
        name: body.name,
        description: body.description,
        isActive: body.isActive ?? true,
      },
      include: { partnerType: { select: { id: true, name: true, slug: true } } },
    });
    await auditLog({
      actorId: user.id,
      entityType: "carrier_type",
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
