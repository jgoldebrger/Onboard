import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { signWebhookBody } from "./webhooks";

describe("signWebhookBody", () => {
  it("produces deterministic HMAC signature", () => {
    const body = JSON.stringify({ event: "application.submitted", data: { id: "app1" } });
    const sig1 = signWebhookBody(body, "test-secret");
    const sig2 = signWebhookBody(body, "test-secret");
    assert.equal(sig1, sig2);
    assert.match(sig1, /^sha256=[a-f0-9]{64}$/);
  });

  it("differs when secret changes", () => {
    const body = '{"event":"test"}';
    const a = signWebhookBody(body, "secret-a");
    const b = signWebhookBody(body, "secret-b");
    assert.notEqual(a, b);
  });
});
