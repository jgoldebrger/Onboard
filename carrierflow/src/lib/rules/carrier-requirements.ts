import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ConditionNode, RuleAction } from "@/types/domain";
import { loadPublishedRules } from "@/lib/rules";
import { evaluateCondition } from "@/lib/rules/evaluator";

export const requirementsRuleName = (carrierSlug: string) =>
  `requirements/${carrierSlug}`;

export function carrierTypeCondition(slug: string): ConditionNode {
  return {
    type: "group",
    op: "AND",
    children: [
      {
        type: "clause",
        field: "carrier_type",
        operator: "eq",
        value: slug,
      },
    ],
  };
}

export function buildRequirementActions(
  questionIds: string[],
  documentTypeIds: string[],
): RuleAction[] {
  const actions: RuleAction[] = [];
  for (const targetId of questionIds) {
    actions.push({ effect: "REQUIRE", targetType: "question", targetId });
  }
  for (const targetId of documentTypeIds) {
    actions.push({ effect: "REQUIRE", targetType: "document", targetId });
  }
  return actions;
}

function extractIdsFromActions(actions: RuleAction[]) {
  const questionIds: string[] = [];
  const documentTypeIds: string[] = [];
  for (const action of actions) {
    if (action.effect !== "REQUIRE") continue;
    if (action.targetType === "question") {
      questionIds.push(action.targetId);
    }
    if (action.targetType === "document") {
      documentTypeIds.push(action.targetId);
    }
  }
  return { questionIds, documentTypeIds };
}

/** Published rules that apply when carrier type matches (for display / merge). */
export async function getMergedCarrierRequirements(carrierSlug: string) {
  const rules = await loadPublishedRules();
  const context = {
    carrierTypeSlug: carrierSlug,
    answers: new Map<string, unknown>(),
    documents: new Map<string, { status: string }>(),
  };

  const questionIds = new Set<string>();
  const documentTypeIds = new Set<string>();

  for (const rule of rules) {
    if (!evaluateCondition(rule.conditions, context)) continue;
    const extracted = extractIdsFromActions(rule.actions);
    extracted.questionIds.forEach((id) => questionIds.add(id));
    extracted.documentTypeIds.forEach((id) => documentTypeIds.add(id));
  }

  return {
    questionIds: [...questionIds],
    documentTypeIds: [...documentTypeIds],
  };
}

/** Canonical rule managed by the carrier-type requirements UI. */
export async function getManagedCarrierRequirements(carrierSlug: string) {
  const name = requirementsRuleName(carrierSlug);
  const version = await db.ruleVersion.findFirst({
    where: {
      name,
      isPublished: true,
      rules: { some: { isEnabled: true } },
    },
    orderBy: { version: "desc" },
  });

  if (!version) {
    return {
      questionIds: [] as string[],
      documentTypeIds: [] as string[],
      ruleVersionId: null,
    };
  }

  const actions = version.actions as RuleAction[];
  const { questionIds, documentTypeIds } = extractIdsFromActions(actions);
  return {
    questionIds,
    documentTypeIds,
    ruleVersionId: version.id,
  };
}

export async function saveManagedCarrierRequirements(input: {
  carrierTypeId: string;
  carrierSlug: string;
  carrierName: string;
  questionIds: string[];
  documentTypeIds: string[];
  actorId: string;
}) {
  const name = requirementsRuleName(input.carrierSlug);
  const conditions = carrierTypeCondition(input.carrierSlug);
  const actions = buildRequirementActions(
    input.questionIds,
    input.documentTypeIds,
  );

  const latest = await db.ruleVersion.findFirst({
    where: { name },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  if (actions.length === 0) {
    await db.rule.updateMany({
      where: { ruleVersion: { name } },
      data: { isEnabled: false },
    });
    return { ruleVersionId: null, ruleId: null, version: 0 };
  }

  const ruleVersion = await db.ruleVersion.create({
    data: {
      name,
      description: `Required questions and documents for ${input.carrierName}`,
      version,
      isPublished: true,
      publishedAt: new Date(),
      createdById: input.actorId,
      conditions: conditions as unknown as Prisma.InputJsonValue,
      actions: actions as unknown as Prisma.InputJsonValue,
    },
  });

  await db.rule.updateMany({
    where: { ruleVersion: { name } },
    data: { isEnabled: false },
  });

  const rule = await db.rule.create({
    data: {
      ruleVersionId: ruleVersion.id,
      priority: 50,
      isEnabled: true,
    },
  });

  return { ruleVersionId: ruleVersion.id, ruleId: rule.id, version };
}
