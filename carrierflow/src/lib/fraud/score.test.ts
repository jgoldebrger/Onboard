import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeFraudScore } from "./score";

const emptyDuplicates = {
  duplicateDot: false,
  duplicateMc: false,
  duplicateEmail: false,
  conflictingApplicationIds: [],
  conflictingApplications: [],
  details: [],
};

const emptyContact = {
  discrepancies: [],
  totalScore: 0,
  maxSeverity: null,
};

describe("computeFraudScore", () => {
  it("adds VoIP and TIN mismatch signals", () => {
    const result = computeFraudScore({
      duplicates: emptyDuplicates,
      contactDiscrepancy: emptyContact,
      voipPhone: true,
      tinMismatch: true,
    });

    const keys = result.signals.map((s) => s.key);
    assert.ok(keys.includes("voip_phone"));
    assert.ok(keys.includes("tin_mismatch"));
    assert.equal(result.score, 55);
    assert.equal(result.level, "high");
  });

  it("adds disposable phone signal", () => {
    const result = computeFraudScore({
      duplicates: emptyDuplicates,
      contactDiscrepancy: emptyContact,
      disposablePhone: true,
    });

    assert.equal(
      result.signals.find((s) => s.key === "disposable_phone")?.points,
      30,
    );
  });
});
