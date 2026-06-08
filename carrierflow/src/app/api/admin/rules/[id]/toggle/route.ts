import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/rules/api-auth";
import { toggleRuleSchema } from "@/lib/rules/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  let user;
  try {
    user = await requirePermission("config:manage");
  } catch (error) {
    return authErrorResponse(error);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = toggleRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await db.rule.findUnique({
    where: { id },
    include: { ruleVersion: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const isEnabled = parsed.data.isEnabled ?? !existing.isEnabled;

  const updated = await db.rule.update({
    where: { id },
    data: { isEnabled },
    include: { ruleVersion: true },
  });

  await auditLog({
    actorId: user.id,
    entityType: "Rule",
    entityId: id,
    action: "rule.toggled",
    before: { isEnabled: existing.isEnabled },
    after: { isEnabled },
  });

  return NextResponse.json({
    id: updated.id,
    isEnabled: updated.isEnabled,
    ruleVersionId: updated.ruleVersionId,
    ruleVersion: {
      id: updated.ruleVersion.id,
      name: updated.ruleVersion.name,
      isPublished: updated.ruleVersion.isPublished,
    },
  });
}
