import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../_utils";

const updateSchema = z.object({
  key: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().nullable().optional(),
  mimeTypes: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("config:manage");
    const { id } = await params;
    const documentType = await db.documentType.findUnique({ where: { id } });
    if (!documentType) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(documentType);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("config:manage");
    const { id } = await params;
    const before = await db.documentType.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = updateSchema.parse(await req.json());
    const updated = await db.documentType.update({
      where: { id },
      data: {
        ...body,
        version: { increment: 1 },
      },
    });
    await auditLog({
      actorId: user.id,
      entityType: "document_type",
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
    const before = await db.documentType.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const docCount = await db.carrierDocument.count({
      where: { documentTypeId: id },
    });
    if (docCount > 0) {
      return NextResponse.json(
        { error: "Document type is referenced by uploaded documents" },
        { status: 409 },
      );
    }
    await db.documentType.delete({ where: { id } });
    await auditLog({
      actorId: user.id,
      entityType: "document_type",
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
