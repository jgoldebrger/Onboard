import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyActions,
  emptyEvaluationResult,
  evaluateCondition,
} from "./evaluator";
import type { ConditionNode, EvaluationContext, RuleAction } from "@/types/domain";

const brokerContext: EvaluationContext = {
  carrierTypeSlug: "broker",
  answers: new Map([["has_lift_gate", false]]),
  documents: new Map(),
};

describe("evaluateCondition", () => {
  it("matches carrier_type eq", () => {
    const node: ConditionNode = {
      type: "clause",
      field: "carrier_type",
      operator: "eq",
      value: "broker",
    };
    assert.equal(evaluateCondition(node, brokerContext), true);
  });

  it("evaluates AND groups", () => {
    const node: ConditionNode = {
      type: "group",
      op: "AND",
      children: [
        {
          type: "clause",
          field: "carrier_type",
          operator: "eq",
          value: "broker",
        },
        {
          type: "clause",
          field: "answer.has_lift_gate",
          operator: "eq",
          value: false,
        },
      ],
    };
    assert.equal(evaluateCondition(node, brokerContext), true);
  });
});

describe("applyActions", () => {
  it("requires document and adds risk", () => {
    const result = emptyEvaluationResult();
    const actions: RuleAction[] = [
      {
        effect: "REQUIRE",
        targetType: "document",
        targetId: "doc-coi",
      },
      {
        effect: "ADD_RISK",
        targetType: "question",
        targetId: "q1",
        params: { points: 15, label: "High risk broker" },
      },
    ];
    applyActions(actions, result, "rule-1");
    assert.deepEqual(result.requiredDocumentTypeIds, ["doc-coi"]);
    assert.equal(result.riskAdditions[0]?.points, 15);
  });

  it("blocks approval", () => {
    const result = emptyEvaluationResult();
    applyActions(
      [{ effect: "BLOCK_APPROVAL", targetType: "carrier_type", targetId: "x" }],
      result,
      "rule-2",
    );
    assert.equal(result.blocked, true);
    assert.ok(result.blockReasons.length > 0);
  });
});
