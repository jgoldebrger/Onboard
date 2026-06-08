import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/rules/api-auth";
import {
  getManagedCarrierRequirements,
  getMergedCarrierRequirements,
  saveManagedCarrierRequirements,
} from "@/lib/rules/carrier-requirements";

type Params = { params: Promise<{ id: string }> };

const saveSchema = z.object({
  questionIds: z.array(z.string()),
  documentTypeIds: z.array(z.string()),
});

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("config:manage");
  } catch (error) {
    return authErrorResponse(error);
  }

  const { id } = await params;
  const carrierType = await db.carrierType.findUnique({ where: { id } });
  if (!carrierType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [questions, documentTypes, managed, effective] = await Promise.all([
    db.question.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
      select: { id: true, key: true, label: true, type: true },
    }),
    db.documentType.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
      select: { id: true, key: true, name: true, description: true },
    }),
    getManagedCarrierRequirements(carrierType.slug),
    getMergedCarrierRequirements(carrierType.slug),
  ]);

  return NextResponse.json({
    carrierType: {
      id: carrierType.id,
      slug: carrierType.slug,
      name: carrierType.name,
    },
    questions,
    documentTypes,
    managed,
    effective,
  });
}

export async function PUT(req: Request, { params }: Params) {
  let user;
  try {
    user = await requirePermission("rules:publish");
  } catch (error) {
    return authErrorResponse(error);
  }

  const { id } = await params;
  const carrierType = await db.carrierType.findUnique({ where: { id } });
  if (!carrierType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await saveManagedCarrierRequirements({
      carrierTypeId: carrierType.id,
      carrierSlug: carrierType.slug,
      carrierName: carrierType.name,
      questionIds: parsed.data.questionIds,
      documentTypeIds: parsed.data.documentTypeIds,
      actorId: user.id,
    });

    await auditLog({
      actorId: user.id,
      entityType: "carrier_type",
      entityId: carrierType.id,
      action: "requirements.updated",
      after: {
        questionIds: parsed.data.questionIds,
        documentTypeIds: parsed.data.documentTypeIds,
        ruleVersionId: result.ruleVersionId,
      },
    });

    const effective = await getMergedCarrierRequirements(carrierType.slug);

    return NextResponse.json({
      ok: true,
      ...result,
      effective,
      managed: {
        questionIds: parsed.data.questionIds,
        documentTypeIds: parsed.data.documentTypeIds,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
