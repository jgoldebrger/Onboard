import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QuestionType } from "@prisma/client";
import { validateQuestionAnswer } from "./validation";

const base = {
  label: "DOT number",
  type: QuestionType.TEXT,
  validation: { preset: "dot" as const },
};

describe("validateQuestionAnswer", () => {
  it("accepts valid DOT", () => {
    const r = validateQuestionAnswer(base, "1234567");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, "1234567");
  });

  it("rejects invalid DOT", () => {
    const r = validateQuestionAnswer(base, "ABC");
    assert.equal(r.ok, false);
  });

  it("normalizes and validates MC", () => {
    const r = validateQuestionAnswer(
      {
        label: "MC",
        type: QuestionType.TEXT,
        validation: { preset: "mc" },
      },
      "mc123456",
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, "MC-123456");
  });
});
