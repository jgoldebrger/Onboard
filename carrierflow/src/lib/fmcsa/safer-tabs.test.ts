import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSaferTabSections, hasExtendedSaferData } from "./safer-tabs";

describe("buildSaferTabSections", () => {
  it("includes all carrier fields across tabs", () => {
    const raw = {
      carrier: {
        content: {
          carrier: {
            dotNumber: "123456",
            legalName: "Acme Trucking LLC",
            phyStreet: "1 Main St",
            inspectVehUS: 42,
            cargoGenFreight: "Y",
          },
          carrierOperation: {
            carrierOperationCode: "A",
          },
        },
        retrievalDate: "2025-01-01",
      },
      basics: { content: [{ basicDesc: "Unsafe Driving", percentile: "75" }] },
      cargoCarried: { content: { cargo: ["General Freight"] } },
      operationClassification: { content: { authorizedForHire: "Y" } },
      oos: { content: { outOfService: "N" } },
      docketNumbers: { content: { docketNumber: "MC-999" } },
      authority: { content: { carrierAuthorityStatus: "A" } },
      syncedAt: "2025-06-01",
    };

    const sections = buildSaferTabSections(raw);
    const allFields = sections.flatMap((s) => Object.keys(s.fields));

    assert.ok(allFields.some((k) => /dotNumber/i.test(k)));
    assert.ok(allFields.some((k) => /legalName/i.test(k)));
    assert.ok(allFields.some((k) => /inspectVeh/i.test(k)));
    assert.ok(allFields.some((k) => /cargo/i.test(k)));
    assert.ok(hasExtendedSaferData(raw));
  });
});
