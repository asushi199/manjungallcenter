import assert from "node:assert/strict";
import test from "node:test";
import {
  PROTECTED_ADMIN_USERNAME,
  canEditProtectedAdminUsername,
  canDeactivateProtectedAdmin,
  canChangeProtectedAdminRole,
  isProtectedAdminUsername,
} from "../lib/protected-admin";

test("default admin account is a protected non-IC username", () => {
  assert.equal(PROTECTED_ADMIN_USERNAME, "admin");
  assert.equal(isProtectedAdminUsername("admin"), true);
  assert.equal(isProtectedAdminUsername("Admin"), true);
  assert.equal(isProtectedAdminUsername("880101081234"), false);
});

test("protected admin account cannot be renamed, downgraded, or deactivated", () => {
  assert.equal(canEditProtectedAdminUsername("admin", "880101081234"), false);
  assert.equal(canEditProtectedAdminUsername("admin", "admin"), true);
  assert.equal(canChangeProtectedAdminRole("admin", "Pengguna"), false);
  assert.equal(canChangeProtectedAdminRole("admin", "Admin"), true);
  assert.equal(canDeactivateProtectedAdmin("admin", false), false);
  assert.equal(canDeactivateProtectedAdmin("admin", true), true);
});
