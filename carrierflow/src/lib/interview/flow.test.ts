import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInterviewReply } from "@/lib/agents/interview-prompts";

describe("interview flow replies", () => {
  it("acknowledges save then asks next", () => {
    const msg = buildInterviewReply({
      missingQuestions: [
        {
          key: "dot_number",
          label: "DOT number",
          type: "TEXT",
          validation: { preset: "dot" },
        },
      ],
      savedAnswerKeys: ["company_legal_name"],
      carrierTypeSlug: "broker",
    });
    assert.match(msg, /Got it/i);
    assert.match(msg, /DOT/i);
  });

  it("introduces carrier type then asks next question after dot", () => {
    const msg = buildInterviewReply({
      missingQuestions: [
        {
          key: "company_legal_name",
          label: "Legal company name",
          type: "TEXT",
          validation: null,
        },
      ],
      carrierTypeSlug: "broker",
    });
    assert.match(msg, /Broker/i);
    assert.match(msg, /Legal company name/i);
  });

  it("asks dot before other fields when dot is first missing", () => {
    const msg = buildInterviewReply({
      missingQuestions: [
        {
          key: "dot_number",
          label: "DOT number",
          type: "TEXT",
          validation: { preset: "dot" },
        },
        {
          key: "company_legal_name",
          label: "Legal company name",
          type: "TEXT",
          validation: null,
        },
      ],
      carrierTypeSlug: "broker",
    });
    assert.match(msg, /DOT/i);
    assert.doesNotMatch(msg, /Legal company name/i);
  });
});
