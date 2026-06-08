import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sortInterviewQuestions } from "./question-order";

describe("sortInterviewQuestions", () => {
  it("puts dot_number before company_legal_name", () => {
    const sorted = sortInterviewQuestions([
      { key: "company_legal_name" },
      { key: "mc_number" },
      { key: "dot_number" },
    ]);
    assert.deepEqual(
      sorted.map((q) => q.key),
      ["dot_number", "company_legal_name", "mc_number"],
    );
  });
});
