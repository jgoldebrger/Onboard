import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { verifyPhone } from "./phone-verify";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.PHONE_VERIFY_API_KEY;
const originalProvider = process.env.PHONE_VERIFY_PROVIDER;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.PHONE_VERIFY_API_KEY;
  } else {
    process.env.PHONE_VERIFY_API_KEY = originalApiKey;
  }
  if (originalProvider === undefined) {
    delete process.env.PHONE_VERIFY_PROVIDER;
  } else {
    process.env.PHONE_VERIFY_PROVIDER = originalProvider;
  }
});

describe("verifyPhone", () => {
  it("no-ops when API key is absent", async () => {
    delete process.env.PHONE_VERIFY_API_KEY;
    const result = await verifyPhone("+15551234567");
    assert.equal(result.available, false);
    assert.equal(result.isVoip, null);
  });

  it("no-ops for empty phone", async () => {
    process.env.PHONE_VERIFY_API_KEY = "test-key";
    const result = await verifyPhone("  ");
    assert.equal(result.available, false);
  });

  it("detects VoIP from Twilio line type", async () => {
    process.env.PHONE_VERIFY_API_KEY = "AC123:secret";
    process.env.PHONE_VERIFY_PROVIDER = "twilio";
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          line_type_intelligence: {
            type: "nonFixedVoip",
            carrier_name: "Google Voice",
          },
        }),
        { status: 200 },
      );

    const result = await verifyPhone("5551234567");
    assert.equal(result.available, true);
    assert.equal(result.isVoip, true);
    assert.equal(result.isDisposable, true);
    assert.equal(result.provider, "twilio");
  });

  it("detects VoIP from Numverify line type", async () => {
    process.env.PHONE_VERIFY_API_KEY = "numverify-key";
    process.env.PHONE_VERIFY_PROVIDER = "numverify";
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          valid: true,
          line_type: "voip",
          carrier: "Bandwidth",
        }),
        { status: 200 },
      );

    const result = await verifyPhone("5559876543");
    assert.equal(result.available, true);
    assert.equal(result.isVoip, true);
    assert.equal(result.provider, "numverify");
  });
});
