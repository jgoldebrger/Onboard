import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../_utils";

const createSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  mimeTypes: z.array(z.string()).min(1),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requirePermission("config:manage");
    const documentTypes = await db.documentType.findMany({
      orderBy: { key: "asc" },
    });
    return NextResponse.json(documentTypes);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission("config:manage");
    const body = createSchema.parse(await req.json());
    const created = await db.documentType.create({
      data: {
        key: body.key,
        name: body.name,
        description: body.description,
        mimeTypes: body.mimeTypes,
        isActive: body.isActive ?? true,
      },
    });
    await auditLog({
      actorId: user.id,
      entityType: "document_type",
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
