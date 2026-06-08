import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatSaferFieldLabel, parseCsaBasicsRows } from "./display-format";

describe("formatSaferFieldLabel", () => {
  it("formats nested keys", () => {
    assert.equal(formatSaferFieldLabel("profile.legalName"), "Legal name");
    assert.equal(formatSaferFieldLabel("allowedToOperate"), "Allowed to operate");
  });
});

describe("parseCsaBasicsRows", () => {
  it("parses basics content array", () => {
    const rows = parseCsaBasicsRows({
      content: [
        {
          basic: {
            basicsType: { basicsShortDesc: "Unsafe Driving" },
            measureValue: "1.49",
            basicsPercentile: "Not Public",
            totalViolation: 451,
            basicsViolationThreshold: "65",
            basicsRunDate: "2017-01-27T05:00:00.000+0000",
          },
        },
      ],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.name, "Unsafe Driving");
    assert.equal(rows[0]!.violations, "451");
  });
});
