import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateSync } from "otplib";
import {
  adminNeedsMfaEnrollment,
  generateMfaEnrollment,
  isAdminMfaRequired,
  isAdminRole,
  verifyTotpCode,
} from "./mfa";

describe("mfa", () => {
  it("generates a valid TOTP secret and verifies codes", () => {
    const { secret } = generateMfaEnrollment("admin@example.com");
    const code = generateSync({ secret });
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

  it("treats admin MFA as optional by default", () => {
    const prev = process.env.REQUIRE_ADMIN_MFA;
    delete process.env.REQUIRE_ADMIN_MFA;
    try {
      assert.equal(isAdminMfaRequired(), false);
      assert.equal(
        adminNeedsMfaEnrollment({ role: "ADMIN", mfaEnabled: false }),
        false,
      );
    } finally {
      if (prev === undefined) delete process.env.REQUIRE_ADMIN_MFA;
      else process.env.REQUIRE_ADMIN_MFA = prev;
    }
  });

  it("requires admin MFA enrollment when REQUIRE_ADMIN_MFA=true", () => {
    const prev = process.env.REQUIRE_ADMIN_MFA;
    process.env.REQUIRE_ADMIN_MFA = "true";
    try {
      assert.equal(isAdminMfaRequired(), true);
      assert.equal(
        adminNeedsMfaEnrollment({ role: "ADMIN", mfaEnabled: false }),
        true,
      );
      assert.equal(
        adminNeedsMfaEnrollment({ role: "ADMIN", mfaEnabled: true }),
        false,
      );
    } finally {
      if (prev === undefined) delete process.env.REQUIRE_ADMIN_MFA;
      else process.env.REQUIRE_ADMIN_MFA = prev;
    }
  });
});
