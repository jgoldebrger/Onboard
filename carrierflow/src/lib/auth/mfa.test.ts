import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authenticator } from "otplib";
import {
  generateMfaEnrollment,
  isAdminRole,
  verifyTotpCode,
} from "./mfa";

describe("mfa", () => {
  it("generates a valid TOTP secret and verifies codes", () => {
    const { secret } = generateMfaEnrollment("admin@example.com");
    const code = authenticator.generate(secret);
    assert.equal(verifyTotpCode(secret, code), true);
  });

  it("rejects invalid TOTP codes", () => {
    const { secret } = generateMfaEnrollment("admin@example.com");
    assert.equal(verifyTotpCode(secret, "000000"), false);
    assert.equal(verifyTotpCode(secret, "abc"), false);
  });

  it("identifies admin roles", () => {
    assert.equal(isAdminRole("ADMIN"), true);
    assert.equal(isAdminRole("SUPER_ADMIN"), true);
    assert.equal(isAdminRole("CARRIER"), false);
  });
});
