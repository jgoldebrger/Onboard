import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFmcsaCrossReferenceMessage } from "./cross-reference-message";

describe("buildFmcsaCrossReferenceMessage", () => {
  it("summarizes registry match and flags", () => {
    const msg = buildFmcsaCrossReferenceMessage(
      {
        verificationId: "v1",
        status: "FAILED",
        companyName: "broker",
        legalName: "USA TRUCK LLC",
        mcNumber: "MC-161412",
        authorityStatus: "ACTIVE",
        matchScore: 0.1,
        riskFlags: ["name_mismatch", "mc_mismatch"],
        prefilledAnswerKeys: ["company_legal_name", "mc_number"],
        dotStatus: "ACTIVE",
        mcStatus: "ACTIVE",
        found: true,
      },
      "213754",
    );
    assert.match(msg, /USA TRUCK LLC/);
    assert.match(msg, /MC-161412/);
    assert.match(msg, /name mismatch/i);
    assert.match(msg, /10%/);
  });
});
