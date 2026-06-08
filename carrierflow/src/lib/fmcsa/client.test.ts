import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveAuthorityStatus, deriveOperationalStatus } from "./client";
import type { FmcsaApiEnvelope } from "./types";

describe("deriveOperationalStatus", () => {
  it("reads allowedToOperate from FMCSA carrier record", () => {
    const carrier = {
      content: {
        carrier: {
          allowedToOperate: "Y",
          outOfService: "N",
        },
      },
    } as FmcsaApiEnvelope;
    const { dotStatus } = deriveOperationalStatus(carrier);
    assert.equal(dotStatus, "ACTIVE");
  });
});

describe("deriveAuthorityStatus", () => {
  it("parses authority array with carrierAuthority", () => {
    const authority = {
      content: [
        {
          carrierAuthority: {
            brokerAuthorityStatus: "I",
            commonAuthorityStatus: "A",
            authorizedForBroker: "N",
          },
        },
      ],
    } as unknown as FmcsaApiEnvelope;
    assert.equal(deriveAuthorityStatus(authority), "ACTIVE");
  });
});
