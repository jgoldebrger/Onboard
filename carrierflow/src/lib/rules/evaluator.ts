import type {
  ConditionNode,
  EvaluationContext,
  EvaluationResult,
  RuleAction,
} from "@/types/domain";

function evaluateClause(
  clause: Extract<ConditionNode, { type: "clause" }>,
  ctx: EvaluationContext,
): boolean {
  const { field, operator, value } = clause;

  let actual: unknown;
  if (field === "carrier_type" || field === "carrierTypeSlug") {
    actual = ctx.carrierTypeSlug;
  } else if (field.startsWith("answer.")) {
    actual = ctx.answers.get(field.replace("answer.", ""));
  } else if (field.startsWith("govData.")) {
    const key = field.replace("govData.", "");
    actual = ctx.govData?.[key];
  } else {
    actual = ctx.answers.get(field);
  }

  switch (operator) {
    case "eq":
      return actual === value;
    case "neq":
      return actual !== value;
    case "gt":
      return Number(actual) > Number(value);
    case "contains":
      return String(actual).toLowerCase().includes(String(value).toLowerCase());
    case "in":
      return Array.isArray(value) && value.includes(actual);
    default:
      return false;
  }
}

export function evaluateCondition(
  node: ConditionNode,
  ctx: EvaluationContext,
): boolean {
  if (node.type === "clause") {
    return evaluateClause(node, ctx);
  }
  const results = node.children.map((child) => evaluateCondition(child, ctx));
  return node.op === "AND" ? results.every(Boolean) : results.some(Boolean);
}

export function applyActions(
  actions: RuleAction[],
  result: EvaluationResult,
  ruleId: string,
): void {
  for (const action of actions) {
    switch (action.effect) {
      case "REQUIRE":
        if (action.targetType === "question") {
          if (!result.requiredQuestionIds.includes(action.targetId)) {
            result.requiredQuestionIds.push(action.targetId);
          }
        }
        if (action.targetType === "document") {
          if (!result.requiredDocumentTypeIds.includes(action.targetId)) {
            result.requiredDocumentTypeIds.push(action.targetId);
          }
        }
        break;
      case "BLOCK_APPROVAL":
        result.blocked = true;
        result.blockReasons.push(
          `Rule ${ruleId} blocks approval`,
        );
        break;
      case "ADD_RISK": {
        const points = Number(action.params?.points ?? 10);
        result.riskAdditions.push({
          ruleId,
          points,
          label: String(action.params?.label ?? ruleId),
        });
        break;
      }
      case "OPTIONAL":
        if (action.targetType === "question") {
          const idx = result.requiredQuestionIds.indexOf(action.targetId);
          if (idx >= 0) {
            result.requiredQuestionIds.splice(idx, 1);
          }
        }
        if (action.targetType === "document") {
          const idx = result.requiredDocumentTypeIds.indexOf(action.targetId);
          if (idx >= 0) {
            result.requiredDocumentTypeIds.splice(idx, 1);
          }
        }
        break;
      default:
        break;
    }
  }
}

export function emptyEvaluationResult(): EvaluationResult {
  return {
    requiredQuestionIds: [],
    requiredDocumentTypeIds: [],
    blocked: false,
    blockReasons: [],
    riskAdditions: [],
  };
}
