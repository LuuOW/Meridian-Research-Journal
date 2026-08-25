import test from "node:test";
import assert from "node:assert";
import {
  validatePasskeyCredential,
  sanitizeCredentialId,
  formatPasskeyLabel,
  getEffectiveRpId,
  base64UrlToUint8Array,
  uint8ArrayToBase64Url,
  generateSecureChallenge,
  generatePortalToken,
  cleanExpiredTokens,
  verifyPortalToken,
  pollAuthToken,
  validateRegistrationToken,
  verifyRegistrationPassword,
  PortalTokenData
} from "./passkeyManager";

test("Passkey Security: Effective RP ID hostname resolution avoids raw IPs", () => {
  assert.strictEqual(getEffectiveRpId("meridian.research.org"), "meridian.research.org");
  assert.strictEqual(getEffectiveRpId("subdomain.example.co.uk"), "subdomain.example.co.uk");
  
  // Raw IP addresses and empty strings are rejected by WebAuthn specifications
  assert.strictEqual(getEffectiveRpId("127.0.0.1"), undefined);
  assert.strictEqual(getEffectiveRpId("192.168.1.100"), undefined);
  assert.strictEqual(getEffectiveRpId(""), undefined);
});

test("Passkey Security: Base64URL encoding/decoding byte roundtrip", () => {
  const originalBytes = new Uint8Array([0, 15, 240, 255, 42, 128, 64, 32, 16, 8, 4, 2, 1]);
  const encoded = uint8ArrayToBase64Url(originalBytes);
  assert.ok(typeof encoded === "string" && encoded.length > 0);
  assert.ok(!encoded.includes("+") && !encoded.includes("/") && !encoded.includes("="));

  const decoded = base64UrlToUint8Array(encoded);
  assert.deepStrictEqual(decoded, originalBytes);
});

test("Passkey Security: Secure challenge generation satisfies entropy length", () => {
  const challenge1 = generateSecureChallenge();
  const challenge2 = generateSecureChallenge();

  assert.ok(challenge1.length >= 32);
  assert.ok(challenge2.length >= 32);
  assert.notStrictEqual(challenge1, challenge2, "Consecutive challenges must be unique");
});

test("Passkey Security: Credential sanitation prevents injection and trims whitespace", () => {
  const rawId = "   cred-id-abc_123--xyz   ";
  assert.strictEqual(sanitizeCredentialId(rawId), "cred-id-abc_123--xyz");

  const nullSafe = sanitizeCredentialId(null as any);
  assert.strictEqual(nullSafe, "");
});

test("Passkey Security: User label formatting produces readable device names", () => {
  const labelWithDevice = formatPasskeyLabel("MacBook Pro M3 Max", "cred-123");
  assert.strictEqual(labelWithDevice, "MacBook Pro M3 Max");

  const labelFallback = formatPasskeyLabel("", "simulated-passkey-abc123def456");
  assert.strictEqual(labelFallback, "Device (abc123de)");

  const labelDefault = formatPasskeyLabel();
  assert.strictEqual(labelDefault, "Registered Biometric Device");
});

test("Portal Token Lifecycle: creation, validation, authorization, and single-use consumption", () => {
  const tokenStore = new Map<string, PortalTokenData>();
  const token = generatePortalToken("auth", tokenStore);
  assert.ok(token && token.length >= 16);

  // Validate token before authorization
  const initialCheck = pollAuthToken(token, tokenStore);
  assert.strictEqual(initialCheck.authorized, false);

  // Authorize with temporary session password
  const authResult = verifyPortalToken(token, true, tokenStore, "test-super-secret-password-2026");
  assert.strictEqual(authResult.success, true);

  // First poll should consume the authorized token
  const consumed = pollAuthToken(token, tokenStore);
  assert.strictEqual(consumed.authorized, true);
  assert.strictEqual(consumed.password, "test-super-secret-password-2026");

  // Replay prevention: second poll on same token must be unauthorized
  const replayAttempt = pollAuthToken(token, tokenStore);
  assert.strictEqual(replayAttempt.authorized, false);
});

test("Portal Token Cleanup: removes expired tokens older than TTL window", () => {
  const tokenStore = new Map<string, PortalTokenData>();
  const oldToken = generatePortalToken("register", tokenStore);
  
  // Clean with simulated future time to trigger TTL expiration
  const futureTime = Date.now() + 60000;
  const removedCount = cleanExpiredTokens(tokenStore, 0, futureTime);
  assert.ok(removedCount >= 1);

  // Validate that old token is gone
  const check = validateRegistrationToken(oldToken, tokenStore);
  assert.strictEqual(check.valid, false);
});
