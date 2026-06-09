import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractFraudFromAuditPayload } from "./waiver";

describe("extractFraudFromAuditPayload", () => {
  it("returns fraud fields from audit after payload", () => {
    const result = extractFraudFromAuditPayload({
      fraudScore: 72,
      fraudLevel: "high",
      status: "PENDING_REVIEW",
    });
    assert.equal(result?.fraudScore, 72);
    assert.equal(result?.fraudLevel, "high");
  });

  it("returns null when no fraud metadata", () => {
    assert.equal(extractFraudFromAuditPayload({ status: "APPROVED" }), null);
    assert.equal(extractFraudFromAuditPayload(null), null);
  });
});
