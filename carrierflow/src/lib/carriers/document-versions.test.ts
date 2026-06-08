import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupDocumentsByType } from "./document-versions";

describe("groupDocumentsByType", () => {
  it("assigns version numbers chronologically and lists newest first", () => {
    const groups = groupDocumentsByType([
      {
        id: "a",
        fileName: "old.pdf",
        mimeType: "application/pdf",
        fileSize: 100,
        uploadedAt: new Date("2025-01-01"),
        storageKey: "k1",
        documentType: { key: "w9", name: "W-9" },
        review: null,
      },
      {
        id: "b",
        fileName: "new.pdf",
        mimeType: "application/pdf",
        fileSize: 200,
        uploadedAt: new Date("2025-06-01"),
        storageKey: "k2",
        documentType: { key: "w9", name: "W-9" },
        review: {
          id: "rev-b",
          status: "PASSED",
          reviewProgress: 100,
          failureReasons: [],
          extractedData: null,
        },
      },
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.versions[0]!.id, "b");
    assert.equal(groups[0]!.versions[0]!.version, 2);
    assert.equal(groups[0]!.versions[1]!.version, 1);
  });
});
