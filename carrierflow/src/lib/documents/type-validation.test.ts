import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDocumentTypeKey,
  validateDocumentContent,
} from "./type-validation";

describe("normalizeDocumentTypeKey", () => {
  it("normalizes w-9 variants", () => {
    assert.equal(normalizeDocumentTypeKey("w-9"), "w9");
    assert.equal(normalizeDocumentTypeKey("W9"), "w9");
  });
});

describe("validateDocumentContent", () => {
  const w9Text = `
    Form W-9
    Request for Taxpayer Identification Number and Certification
    Employer identification number
    Federal tax classification
  `;

  const coiText = `
    Certificate of Insurance
    ACORD 25
    Policy Number: 12345
    Certificate Holder: Fabuwood
  `;

  it("accepts W-9 content when W-9 expected", () => {
    const r = validateDocumentContent({
      expectedTypeKey: "w9",
      extractedText: w9Text,
    });
    assert.equal(r.matches, true);
  });

  it("rejects COI content when W-9 expected", () => {
    const r = validateDocumentContent({
      expectedTypeKey: "w9",
      extractedText: coiText,
    });
    assert.equal(r.matches, false);
  });

  it("rejects unrelated short text", () => {
    const r = validateDocumentContent({
      expectedTypeKey: "w9",
      extractedText: "Random project map notes only.",
    });
    assert.equal(r.matches, false);
  });
});
