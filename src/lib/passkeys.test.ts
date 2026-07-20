import { test } from "node:test";
import assert from "node:assert";
import {
  PortalTokenData,
  validatePasskeyCredential,
  generatePortalToken,
  cleanExpiredTokens,
  verifyPortalToken,
  pollAuthToken,
  validateRegistrationToken,
  verifyRegistrationPassword
} from "./passkeyManager";

test("validatePasskeyCredential validates credential structure correctly", () => {
  // 1. Valid credentials
  assert.strictEqual(validatePasskeyCredential({ id: "cred-123", type: "public-key" }), true, "Valid credential structure should be approved");
  assert.strictEqual(validatePasskeyCredential({ id: "webauthn_id_xyz" }), true, "Minimal valid credential with only ID should be approved");

  // 2. Invalid credentials
  assert.strictEqual(validatePasskeyCredential(null), false, "Null credential should be rejected");
  assert.strictEqual(validatePasskeyCredential(undefined), false, "Undefined credential should be rejected");
  assert.strictEqual(validatePasskeyCredential({}), false, "Empty credential object should be rejected");
  assert.strictEqual(validatePasskeyCredential({ type: "public-key" }), false, "Credential without ID should be rejected");
  assert.strictEqual(validatePasskeyCredential({ id: "   ", type: "public-key" }), false, "Credential with blank ID should be rejected");
});

test("generatePortalToken creates unique tokens and registers them", () => {
  const portalTokens = new Map<string, PortalTokenData>();

  // Generate a registration token
  const token1 = generatePortalToken("register", portalTokens);
  assert.ok(token1, "Token should be a non-empty string");
  assert.strictEqual(portalTokens.has(token1), true, "Map should contain the generated token");
  
  const token1Data = portalTokens.get(token1);
  assert.ok(token1Data, "Token data should exist");
  assert.strictEqual(token1Data?.type, "register", "Token type should be 'register'");
  assert.strictEqual(token1Data?.authorized, false, "Token should be unauthorized initially");

  // Generate an auth token
  const token2 = generatePortalToken("auth", portalTokens);
  assert.notStrictEqual(token1, token2, "Subsequent tokens should be unique");
  assert.strictEqual(portalTokens.get(token2)?.type, "auth", "Token type should be 'auth'");
});

test("cleanExpiredTokens correctly purges expired portal tokens only", () => {
  const portalTokens = new Map<string, PortalTokenData>();
  const now = 10000000; // Mock current time base

  // Create active token (5 minutes old)
  portalTokens.set("active-token", {
    type: "register",
    createdAt: now - 5 * 60 * 1000,
    authorized: false
  });

  // Create expired token (20 minutes old)
  portalTokens.set("expired-token", {
    type: "auth",
    createdAt: now - 20 * 60 * 1000,
    authorized: false
  });

  // Perform clean
  const deletedCount = cleanExpiredTokens(portalTokens, 15 * 60 * 1000, now);
  
  assert.strictEqual(deletedCount, 1, "Exactly one expired token should be purged");
  assert.strictEqual(portalTokens.has("active-token"), true, "Active token should be preserved");
  assert.strictEqual(portalTokens.has("expired-token"), false, "Expired token should be deleted");
});

test("verifyPortalToken authorizes tokens and sets password", () => {
  const portalTokens = new Map<string, PortalTokenData>();
  const token = "my-test-token";

  portalTokens.set(token, {
    type: "register",
    createdAt: Date.now(),
    authorized: false
  });

  // 1. Invalid or missing tokens
  const errRes1 = verifyPortalToken("", true, portalTokens);
  assert.strictEqual(errRes1.success, false);
  assert.strictEqual(errRes1.error, "Token is required");

  const errRes2 = verifyPortalToken("unknown-token", true, portalTokens);
  assert.strictEqual(errRes2.success, false);
  assert.strictEqual(errRes2.error, "Token not found or expired");

  // 2. Verification failed request
  const failRes = verifyPortalToken(token, false, portalTokens);
  assert.strictEqual(failRes.success, false);
  assert.strictEqual(failRes.error, "Verification failed");
  assert.strictEqual(portalTokens.get(token)?.authorized, false, "Token authorization status should remain false on failure");

  // 3. Successful verification
  const successRes = verifyPortalToken(token, true, portalTokens, "custom-editor-password");
  assert.strictEqual(successRes.success, true);
  
  const updatedData = portalTokens.get(token);
  assert.strictEqual(updatedData?.authorized, true, "Token should be marked authorized");
  assert.strictEqual(updatedData?.password, "custom-editor-password", "Password should be bound to the portal token");
});

test("pollAuthToken monitors authorization and consumes token on success", () => {
  const portalTokens = new Map<string, PortalTokenData>();
  const token = "poll-token";

  portalTokens.set(token, {
    type: "auth",
    createdAt: Date.now(),
    authorized: false
  });

  // 1. Parameter edge cases
  const errPoll1 = pollAuthToken("", portalTokens);
  assert.strictEqual(errPoll1.authorized, false);
  assert.strictEqual(errPoll1.error, "Token is required");

  const errPoll2 = pollAuthToken("missing-token", portalTokens);
  assert.strictEqual(errPoll2.authorized, false);
  assert.strictEqual(errPoll2.error, "Token not found or expired");

  // 2. Poll unauthorized token
  const poll1 = pollAuthToken(token, portalTokens);
  assert.strictEqual(poll1.authorized, false, "Polling an unauthorized token should return false");
  assert.strictEqual(portalTokens.has(token), true, "Token should NOT be deleted if unauthorized");

  // 3. Authorize token
  verifyPortalToken(token, true, portalTokens, "unlocked-secret");

  // 4. Poll authorized token (consumption)
  const poll2 = pollAuthToken(token, portalTokens);
  assert.strictEqual(poll2.authorized, true, "Polling authorized token should return true");
  assert.strictEqual(poll2.password, "unlocked-secret", "Polling should return the associated password");
  assert.strictEqual(portalTokens.has(token), false, "Authorized token should be deleted/consumed on a successful poll");
});

test("validateRegistrationToken validates token correctly", () => {
  const portalTokens = new Map<string, PortalTokenData>();

  // 1. Missing token
  const res1 = validateRegistrationToken(undefined, portalTokens);
  assert.strictEqual(res1.valid, false);
  assert.match(res1.error || "", /Portal token is required/);

  // 2. Token not found
  const res2 = validateRegistrationToken("invalid-token", portalTokens);
  assert.strictEqual(res2.valid, false);
  assert.match(res2.error || "", /Invalid or expired registration/);

  // 3. Token exists but has wrong type
  portalTokens.set("auth-token", {
    type: "auth",
    createdAt: Date.now(),
    authorized: false
  });
  const res3 = validateRegistrationToken("auth-token", portalTokens);
  assert.strictEqual(res3.valid, false);
  assert.match(res3.error || "", /Token type must be register/);

  // 4. Token is valid registration token
  portalTokens.set("reg-token", {
    type: "register",
    createdAt: Date.now(),
    authorized: false
  });
  const res4 = validateRegistrationToken("reg-token", portalTokens);
  assert.strictEqual(res4.valid, true);
});

test("verifyRegistrationPassword checks expected password successfully", () => {
  // 1. Password mismatch or missing
  const res1 = verifyRegistrationPassword(undefined, "meridian");
  assert.strictEqual(res1.authorized, false);
  assert.match(res1.error || "", /Incorrect editor password/);

  const res2 = verifyRegistrationPassword("wrong-pass", "meridian");
  assert.strictEqual(res2.authorized, false);
  assert.match(res2.error || "", /Incorrect editor password/);

  // 2. Password matches
  const res3 = verifyRegistrationPassword("meridian", "meridian");
  assert.strictEqual(res3.authorized, true);
});

