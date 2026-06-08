import { NextResponse } from "next/server";
import { QuestionType } from "@prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../_utils";

const createSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(256),
  type: z.nativeEnum(QuestionType),
  options: z.unknown().optional(),
  validation: z.unknown().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requirePermission("config:manage");
    const questions = await db.question.findMany({
      orderBy: { key: "asc" },
    });
    return NextResponse.json(questions);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission("config:manage");
    const body = createSchema.parse(await req.json());
    const created = await db.question.create({
      data: {
        key: body.key,
        label: body.label,
        type: body.type,
        options: body.options as object | undefined,
        validation: body.validation as object | undefined,
        isActive: body.isActive ?? true,
      },
    });
    await auditLog({
      actorId: user.id,
      entityType: "question",
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
