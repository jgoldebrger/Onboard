import { NextResponse } from "next/server";
import { Prisma, QuestionType } from "@prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../_utils";

const updateSchema = z.object({
  key: z.string().min(1).max(64).optional(),
  label: z.string().min(1).max(256).optional(),
  type: z.nativeEnum(QuestionType).optional(),
  options: z.unknown().nullable().optional(),
  validation: z.unknown().nullable().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("config:manage");
    const { id } = await params;
    const question = await db.question.findUnique({ where: { id } });
    if (!question) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(question);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("config:manage");
    const { id } = await params;
    const before = await db.question.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = updateSchema.parse(await req.json());
    const updated = await db.question.update({
      where: { id },
      data: {
        key: body.key,
        label: body.label,
        type: body.type,
        options:
          body.options === null
            ? Prisma.JsonNull
            : (body.options as Prisma.InputJsonValue | undefined),
        validation:
          body.validation === null
            ? Prisma.JsonNull
            : (body.validation as Prisma.InputJsonValue | undefined),
        isActive: body.isActive,
        version: { increment: 1 },
      },
    });
    await auditLog({
      actorId: user.id,
      entityType: "question",
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
    const before = await db.question.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const answerCount = await db.applicationAnswer.count({
      where: { questionId: id },
    });
    if (answerCount > 0) {
      return NextResponse.json(
        { error: "Question has answers on applications" },
        { status: 409 },
      );
    }
    await db.question.delete({ where: { id } });
    await auditLog({
      actorId: user.id,
      entityType: "question",
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
