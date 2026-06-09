import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { verifyTin } from "./tin-verify";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.TIN_VERIFY_API_KEY;
const originalProvider = process.env.TIN_VERIFY_PROVIDER;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.TIN_VERIFY_API_KEY;
  } else {
    process.env.TIN_VERIFY_API_KEY = originalApiKey;
  }
  if (originalProvider === undefined) {
    delete process.env.TIN_VERIFY_PROVIDER;
  } else {
    process.env.TIN_VERIFY_PROVIDER = originalProvider;
  }
});

describe("verifyTin", () => {
  it("no-ops when API key is absent", async () => {
    delete process.env.TIN_VERIFY_API_KEY;
    const result = await verifyTin({ tin: "12-3456789", name: "Acme LLC" });
    assert.equal(result.available, false);
    assert.equal(result.match, null);
  });

  it("no-ops for invalid TIN", async () => {
    process.env.TIN_VERIFY_API_KEY = "test-key";
    const result = await verifyTin({ tin: "bad", name: "Acme LLC" });
    assert.equal(result.available, false);
  });

  it("returns mismatch from TaxID Pro provider", async () => {
    process.env.TIN_VERIFY_API_KEY = "taxid-key";
    process.env.TIN_VERIFY_PROVIDER = "taxidpro";
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ match: false, message: "No match" }), {
        status: 200,
      });

    const result = await verifyTin({ tin: "123456789", name: "Wrong Name Inc" });
    assert.equal(result.available, true);
    assert.equal(result.match, false);
    assert.equal(result.tin, "12-3456789");
    assert.equal(result.provider, "taxidpro");
  });

  it("returns match from Sovos provider", async () => {
    process.env.TIN_VERIFY_API_KEY = "sovos-key";
    process.env.TIN_VERIFY_PROVIDER = "sovos";
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ matched: true, status: "MATCH" }), {
        status: 200,
      });

    const result = await verifyTin({ tin: "98-7654321", name: "Carrier Co" });
    assert.equal(result.available, true);
    assert.equal(result.match, true);
    assert.equal(result.provider, "sovos");
  });
});
