import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyEvaluationResult } from "./evaluator";

describe("rules simulation types", () => {
  it("empty evaluation has no requirements", () => {
    const result = emptyEvaluationResult();
    assert.equal(result.requiredQuestionIds.length, 0);
    assert.equal(result.requiredDocumentTypeIds.length, 0);
    assert.equal(result.blocked, false);
  });
});
