import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { authErrorResponse } from "@/lib/rules/api-auth";
import { createRuleSchema } from "@/lib/rules/schemas";

function serializeRule(
  rule: {
    id: string;
    priority: number;
    isEnabled: boolean;
    ruleVersion: {
      id: string;
      name: string;
      description: string | null;
      version: number;
      isPublished: boolean;
      publishedAt: Date | null;
      conditions: unknown;
      actions: unknown;
      createdAt: Date;
    };
  },
) {
  return {
    id: rule.id,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
    ruleVersion: {
      id: rule.ruleVersion.id,
      name: rule.ruleVersion.name,
      description: rule.ruleVersion.description,
      version: rule.ruleVersion.version,
      isPublished: rule.ruleVersion.isPublished,
      publishedAt: rule.ruleVersion.publishedAt?.toISOString() ?? null,
      conditions: rule.ruleVersion.conditions,
      actions: rule.ruleVersion.actions,
      createdAt: rule.ruleVersion.createdAt.toISOString(),
    },
  };
}

export async function GET() {
  try {
    await requirePermission("config:manage");
  } catch (error) {
    return authErrorResponse(error);
  }

  const rules = await db.rule.findMany({
    include: { ruleVersion: true },
    orderBy: [{ ruleVersion: { createdAt: "desc" } }, { priority: "asc" }],
  });

  return NextResponse.json({ rules: rules.map(serializeRule) });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requirePermission("config:manage");
  } catch (error) {
    return authErrorResponse(error);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, description, priority, conditions, actions } = parsed.data;

  const latestVersion = await db.ruleVersion.findFirst({
    where: { name },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latestVersion?.version ?? 0) + 1;

  const ruleVersion = await db.ruleVersion.create({
    data: {
      name,
      description,
      version,
      isPublished: false,
      createdById: user.id,
      conditions: conditions as Prisma.InputJsonValue,
      actions: actions as Prisma.InputJsonValue,
    },
  });

  const rule = await db.rule.create({
    data: {
      ruleVersionId: ruleVersion.id,
      priority: priority ?? 100,
      isEnabled: true,
    },
    include: { ruleVersion: true },
  });

  await auditLog({
    actorId: user.id,
    entityType: "RuleVersion",
    entityId: ruleVersion.id,
    action: "rule_version.created",
    after: { ruleId: rule.id, name, version },
  });

  return NextResponse.json(serializeRule(rule), { status: 201 });
}
