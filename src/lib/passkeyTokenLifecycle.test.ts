import test from "node:test";
import assert from "node:assert";
import {
  validatePasskeyCredential,
  generatePortalToken,
  cleanExpiredTokens,
  verifyPortalToken,
  pollAuthToken,
  PortalTokenData
} from "./passkeyManager.js";

test("validatePasskeyCredential correctly verifies passkey credential objects", () => {
  assert.strictEqual(validatePasskeyCredential({ id: "cred-12345", type: "public-key" }), true);
  assert.strictEqual(validatePasskeyCredential({ id: "a" }), true);
  assert.strictEqual(validatePasskeyCredential({ id: "" }), false);
  assert.strictEqual(validatePasskeyCredential({ id: "   " }), false);
  assert.strictEqual(validatePasskeyCredential(null), false);
  assert.strictEqual(validatePasskeyCredential(undefined), false);
  assert.strictEqual(validatePasskeyCredential({}), false);
});

test("generatePortalToken creates unique tokens and records creation time", () => {
  const portalMap = new Map<string, PortalTokenData>();
  const token1 = generatePortalToken("register", portalMap);
  const token2 = generatePortalToken("auth", portalMap);

  assert.ok(token1 && token2);
  assert.notStrictEqual(token1, token2);
  assert.strictEqual(portalMap.get(token1)?.type, "register");
  assert.strictEqual(portalMap.get(token2)?.type, "auth");
  assert.strictEqual(portalMap.get(token1)?.authorized, false);
});

test("cleanExpiredTokens removes stale tokens older than maxAgeMs", () => {
  const portalMap = new Map<string, PortalTokenData>();
  const now = 1000000;

  portalMap.set("valid-token", {
    type: "auth",
    createdAt: now - 5000,
    authorized: false
  });

  portalMap.set("expired-token-1", {
    type: "register",
    createdAt: now - 20000,
    authorized: false
  });

  portalMap.set("expired-token-2", {
    type: "auth",
    createdAt: now - 30000,
    authorized: false
  });

  const pruned = cleanExpiredTokens(portalMap, 10000, now);
  assert.strictEqual(pruned, 2);
  assert.strictEqual(portalMap.has("valid-token"), true);
  assert.strictEqual(portalMap.has("expired-token-1"), false);
  assert.strictEqual(portalMap.has("expired-token-2"), false);
});

test("verifyPortalToken authorizes portal sessions and sets password", () => {
  const portalMap = new Map<string, PortalTokenData>();
  const token = generatePortalToken("auth", portalMap);

  const failRes = verifyPortalToken(token, false, portalMap);
  assert.strictEqual(failRes.success, false);

  const successRes = verifyPortalToken(token, true, portalMap, "custom-meridian-pw");
  assert.strictEqual(successRes.success, true);
  assert.strictEqual(portalMap.get(token)?.authorized, true);
  assert.strictEqual(portalMap.get(token)?.password, "custom-meridian-pw");
});

test("pollAuthToken returns status and deletes consumed authorized tokens", () => {
  const portalMap = new Map<string, PortalTokenData>();
  const token = generatePortalToken("auth", portalMap);

  // Still unauthorized
  const poll1 = pollAuthToken(token, portalMap);
  assert.strictEqual(poll1.authorized, false);
  assert.strictEqual(portalMap.has(token), true);

  // Authorize token
  verifyPortalToken(token, true, portalMap, "meridian-secure");

  // Polling authorized token consumes it
  const poll2 = pollAuthToken(token, portalMap);
  assert.strictEqual(poll2.authorized, true);
  assert.strictEqual(poll2.password, "meridian-secure");
  assert.strictEqual(portalMap.has(token), false);

  // Subsequent poll fails because token was consumed
  const poll3 = pollAuthToken(token, portalMap);
  assert.strictEqual(poll3.authorized, false);
  assert.strictEqual(poll3.error, "Token not found or expired");
});
