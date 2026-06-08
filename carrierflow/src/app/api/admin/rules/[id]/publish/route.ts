import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/rules/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;

  let user;
  try {
    user = await requirePermission("rules:publish");
  } catch (error) {
    return authErrorResponse(error);
  }

  const ruleVersion = await db.ruleVersion.findUnique({
    where: { id },
    include: { rules: true },
  });

  if (!ruleVersion) {
    return NextResponse.json({ error: "Rule version not found" }, { status: 404 });
  }

  if (ruleVersion.isPublished) {
    return NextResponse.json(
      { error: "Rule version is already published" },
      { status: 409 },
    );
  }

  const publishedAt = new Date();
  const updated = await db.ruleVersion.update({
    where: { id },
    data: {
      isPublished: true,
      publishedAt,
    },
    include: { rules: true },
  });

  await auditLog({
    actorId: user.id,
    entityType: "RuleVersion",
    entityId: id,
    action: "rule_version.published",
    before: { isPublished: false },
    after: { isPublished: true, publishedAt: publishedAt.toISOString() },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    version: updated.version,
    isPublished: updated.isPublished,
    publishedAt: updated.publishedAt?.toISOString(),
    ruleIds: updated.rules.map((r) => r.id),
  });
}
