import test from "node:test";
import assert from "node:assert";
import {
  validatePasskeyCredential,
  generatePortalToken,
  cleanExpiredTokens,
  verifyPortalToken,
  pollAuthToken,
  validateRegistrationToken,
  verifyRegistrationPassword,
  PortalTokenData
} from "./passkeyManager.js";

test("validatePasskeyCredential returns false for null, undefined, or empty credentials", () => {
  assert.strictEqual(validatePasskeyCredential(null), false);
  assert.strictEqual(validatePasskeyCredential(undefined), false);
  assert.strictEqual(validatePasskeyCredential({}), false);
  assert.strictEqual(validatePasskeyCredential({ id: "  " }), false);
  assert.strictEqual(validatePasskeyCredential({ id: 123 as unknown as string }), false);
});

test("validatePasskeyCredential returns true for valid credential with non-empty string ID", () => {
  assert.strictEqual(validatePasskeyCredential({ id: "passkey-id-98765" }), true);
});

test("generatePortalToken creates tokens with specified type or defaults to register", () => {
  const map = new Map<string, PortalTokenData>();
  const regToken = generatePortalToken("register", map);
  assert.ok(map.has(regToken));
  assert.strictEqual(map.get(regToken)?.type, "register");
  assert.strictEqual(map.get(regToken)?.authorized, false);

  const authToken = generatePortalToken("auth", map);
  assert.ok(map.has(authToken));
  assert.strictEqual(map.get(authToken)?.type, "auth");

  const defaultToken = generatePortalToken(undefined, map);
  assert.strictEqual(map.get(defaultToken)?.type, "register");
});

test("cleanExpiredTokens removes items older than maxAgeMs and returns exact deleted count", () => {
  const map = new Map<string, PortalTokenData>();
  const now = 1000000;

  map.set("valid1", { type: "register", createdAt: now - 100 });
  map.set("expired1", { type: "auth", createdAt: now - 10000 });
  map.set("expired2", { type: "register", createdAt: now - 20000 });

  const deleted = cleanExpiredTokens(map, 5000, now);
  assert.strictEqual(deleted, 2);
  assert.ok(map.has("valid1"));
  assert.ok(!map.has("expired1"));
  assert.ok(!map.has("expired2"));
});

test("verifyPortalToken handles missing token or invalid token gracefully", () => {
  const map = new Map<string, PortalTokenData>();
  const resEmpty = verifyPortalToken("", true, map);
  assert.strictEqual(resEmpty.success, false);
  assert.strictEqual(resEmpty.error, "Token is required");

  const resNotFound = verifyPortalToken("missing-token", true, map);
  assert.strictEqual(resNotFound.success, false);
  assert.strictEqual(resNotFound.error, "Token not found or expired");
});

test("verifyPortalToken authorizes token with custom password on success", () => {
  const map = new Map<string, PortalTokenData>();
  const token = generatePortalToken("auth", map);

  const res = verifyPortalToken(token, true, map, "custom-pass-123");
  assert.strictEqual(res.success, true);
  assert.strictEqual(map.get(token)?.authorized, true);
  assert.strictEqual(map.get(token)?.password, "custom-pass-123");
});

test("verifyPortalToken returns error when success is false", () => {
  const map = new Map<string, PortalTokenData>();
  const token = generatePortalToken("auth", map);

  const res = verifyPortalToken(token, false, map);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, "Verification failed");
  assert.strictEqual(map.get(token)?.authorized, false);
});

test("pollAuthToken consumes authorized token and returns password", () => {
  const map = new Map<string, PortalTokenData>();
  const token = generatePortalToken("auth", map);

  // Poll before authorization
  const pendingPoll = pollAuthToken(token, map);
  assert.strictEqual(pendingPoll.authorized, false);
  assert.ok(map.has(token), "Token should remain in map while pending");

  // Authorize token
  verifyPortalToken(token, true, map, "secret-pass");

  // Poll after authorization
  const successPoll = pollAuthToken(token, map);
  assert.strictEqual(successPoll.authorized, true);
  assert.strictEqual(successPoll.password, "secret-pass");
  assert.ok(!map.has(token), "Token should be consumed and deleted from map");
});

test("validateRegistrationToken checks for token existence and type", () => {
  const map = new Map<string, PortalTokenData>();
  const regToken = generatePortalToken("register", map);
  const authToken = generatePortalToken("auth", map);

  assert.strictEqual(validateRegistrationToken(null, map).valid, false);
  assert.strictEqual(validateRegistrationToken("invalid", map).valid, false);

  const wrongType = validateRegistrationToken(authToken, map);
  assert.strictEqual(wrongType.valid, false);
  assert.ok(wrongType.error?.includes("type must be register"));

  const validRes = validateRegistrationToken(regToken, map);
  assert.strictEqual(validRes.valid, true);
});

test("verifyRegistrationPassword checks password matching", () => {
  assert.strictEqual(verifyRegistrationPassword(null, "expected123").authorized, false);
  assert.strictEqual(verifyRegistrationPassword("wrong", "expected123").authorized, false);
  assert.strictEqual(verifyRegistrationPassword("expected123", "expected123").authorized, true);
});
