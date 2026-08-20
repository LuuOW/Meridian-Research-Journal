import { test } from "node:test";
import assert from "node:assert";
import {
  PortalTokenData,
  PasskeyRecord,
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
  registerNewPasskey,
  removePasskeyById,
  updatePasskeyUsage,
  findPasskeyById,
  prunePasskeys
} from "./passkeyManager";

test("Passkey Production: validatePasskeyCredential thoroughly verifies various inputs", () => {
  // Valid credentials
  assert.strictEqual(validatePasskeyCredential({ id: "valid-cred-id-12345" }), true);
  assert.strictEqual(validatePasskeyCredential({ id: "cred-abc", type: "public-key", publicKey: "PUBKEY" }), true);
  assert.strictEqual(validatePasskeyCredential({ id: "simulated-passkey-xyz" }), true);

  // Invalid credentials
  assert.strictEqual(validatePasskeyCredential(null), false);
  assert.strictEqual(validatePasskeyCredential(undefined), false);
  assert.strictEqual(validatePasskeyCredential({} as any), false);
  assert.strictEqual(validatePasskeyCredential({ id: "" }), false);
  assert.strictEqual(validatePasskeyCredential({ id: "   \t\n  " }), false);
  assert.strictEqual(validatePasskeyCredential({ id: 12345 as any }), false);
  assert.strictEqual(validatePasskeyCredential("string-not-object" as any), false);
  assert.strictEqual(validatePasskeyCredential([] as any), false);
});

test("Passkey Production: sanitizeCredentialId normalizes string inputs", () => {
  assert.strictEqual(sanitizeCredentialId("  my-cred-id  "), "my-cred-id");
  assert.strictEqual(sanitizeCredentialId(""), "");
  assert.strictEqual(sanitizeCredentialId(null), "");
  assert.strictEqual(sanitizeCredentialId(undefined), "");
  assert.strictEqual(sanitizeCredentialId(1234 as any), "");
});

test("Passkey Production: formatPasskeyLabel generates clean user-facing labels", () => {
  assert.strictEqual(formatPasskeyLabel("MacBook Touch ID", "id-123"), "MacBook Touch ID");
  assert.strictEqual(formatPasskeyLabel("  iPad Pro Face ID  ", "id-123"), "iPad Pro Face ID");
  assert.strictEqual(formatPasskeyLabel("", "simulated-passkey-a1b2c3d4e5"), "Device (a1b2c3d4)");
  assert.strictEqual(formatPasskeyLabel(undefined, "mycredential99"), "Device (mycreden)");
  assert.strictEqual(formatPasskeyLabel("", ""), "Registered Biometric Device");
  assert.strictEqual(formatPasskeyLabel(undefined, undefined), "Registered Biometric Device");
});

test("Passkey Production: getEffectiveRpId strictly filters IP addresses and malformed hostnames for WebAuthn", () => {
  // Valid domain hostnames
  assert.strictEqual(getEffectiveRpId("ask-meridian.uk"), "ask-meridian.uk");
  assert.strictEqual(getEffectiveRpId("subdomain.example.com"), "subdomain.example.com");
  assert.strictEqual(getEffectiveRpId("localhost"), "localhost");
  assert.strictEqual(getEffectiveRpId("AIS-Dev-App.run.app"), "ais-dev-app.run.app");

  // Invalid hostnames according to WebAuthn specification (IP addresses must return undefined)
  assert.strictEqual(getEffectiveRpId("127.0.0.1"), undefined);
  assert.strictEqual(getEffectiveRpId("192.168.1.100"), undefined);
  assert.strictEqual(getEffectiveRpId("10.0.0.1"), undefined);
  assert.strictEqual(getEffectiveRpId("[::1]"), undefined);
  assert.strictEqual(getEffectiveRpId("::1"), undefined);
  assert.strictEqual(getEffectiveRpId(""), undefined);
  assert.strictEqual(getEffectiveRpId(undefined), undefined);
  assert.strictEqual(getEffectiveRpId("   "), undefined);
});

test("Passkey Production: base64UrlToUint8Array and uint8ArrayToBase64Url roundtrip correctly", () => {
  const originalBytes = new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253, 254, 255]);
  const b64Url = uint8ArrayToBase64Url(originalBytes);
  assert.ok(typeof b64Url === "string" && b64Url.length > 0);
  assert.strictEqual(b64Url.includes("+"), false, "Must not contain standard base64 +");
  assert.strictEqual(b64Url.includes("/"), false, "Must not contain standard base64 /");
  assert.strictEqual(b64Url.includes("="), false, "Must not contain base64 padding =");

  const restoredBytes = base64UrlToUint8Array(b64Url);
  assert.strictEqual(restoredBytes.length, originalBytes.length);
  for (let i = 0; i < originalBytes.length; i++) {
    assert.strictEqual(restoredBytes[i], originalBytes[i]);
  }

  // Edge cases
  assert.strictEqual(uint8ArrayToBase64Url(new Uint8Array(0)), "");
  assert.strictEqual(base64UrlToUint8Array("").length, 0);
});

test("Passkey Production: generateSecureChallenge produces valid non-empty base64url challenge", () => {
  const ch1 = generateSecureChallenge();
  const ch2 = generateSecureChallenge();
  assert.ok(ch1 && ch1.length >= 16);
  assert.ok(ch2 && ch2.length >= 16);
  assert.notStrictEqual(ch1, ch2, "Challenges must be unique");
  assert.strictEqual(ch1.includes("+"), false);
  assert.strictEqual(ch1.includes("/"), false);
});

test("Passkey Production: portal token lifecycle and token cleanup", () => {
  const map = new Map<string, PortalTokenData>();
  const baseTime = 1700000000000;

  // Generate tokens
  const regToken = generatePortalToken("register", map);
  const authToken = generatePortalToken("auth", map);

  assert.strictEqual(map.get(regToken)?.type, "register");
  assert.strictEqual(map.get(authToken)?.type, "auth");
  assert.strictEqual(map.get(regToken)?.authorized, false);

  // Set explicit timestamps
  map.get(regToken)!.createdAt = baseTime - 5 * 60 * 1000; // 5 min ago (active)
  map.get(authToken)!.createdAt = baseTime - 30 * 60 * 1000; // 30 min ago (expired)

  const purgedCount = cleanExpiredTokens(map, 15 * 60 * 1000, baseTime);
  assert.strictEqual(purgedCount, 1);
  assert.ok(map.has(regToken), "Active token must remain");
  assert.ok(!map.has(authToken), "Stale token must be purged");
});

test("Passkey Production: replay attack prevention in pollAuthToken", () => {
  const map = new Map<string, PortalTokenData>();
  const token = generatePortalToken("auth", map);

  // 1. Pending poll
  const res1 = pollAuthToken(token, map);
  assert.strictEqual(res1.authorized, false);
  assert.ok(map.has(token), "Token remains in map while waiting");

  // 2. Authorize token
  const verifyRes = verifyPortalToken(token, true, map, "meridian-test-pass");
  assert.strictEqual(verifyRes.success, true);

  // 3. First poll consumes and succeeds
  const res2 = pollAuthToken(token, map);
  assert.strictEqual(res2.authorized, true);
  assert.strictEqual(res2.password, "meridian-test-pass");
  assert.ok(!map.has(token), "Token must be deleted from map after consumption");

  // 4. Second poll fails because token was already consumed (Replay Protection)
  const res3 = pollAuthToken(token, map);
  assert.strictEqual(res3.authorized, false);
  assert.strictEqual(res3.error, "Token not found or expired");
});

test("Passkey Production: validateRegistrationToken enforces token type and presence", () => {
  const map = new Map<string, PortalTokenData>();
  const regToken = generatePortalToken("register", map);
  const authToken = generatePortalToken("auth", map);

  // Valid registration token
  const v1 = validateRegistrationToken(regToken, map);
  assert.strictEqual(v1.valid, true);

  // Auth token cannot be used for registration
  const v2 = validateRegistrationToken(authToken, map);
  assert.strictEqual(v2.valid, false);
  assert.ok(v2.error?.includes("type must be register"));

  // Missing or unknown token
  const v3 = validateRegistrationToken(null, map);
  assert.strictEqual(v3.valid, false);
  const v4 = validateRegistrationToken("unknown-token-xyz", map);
  assert.strictEqual(v4.valid, false);
});

test("Passkey Production: verifyRegistrationPassword verifies matching passwords", () => {
  const expected = "super-secret-editor-password";

  assert.strictEqual(verifyRegistrationPassword("super-secret-editor-password", expected).authorized, true);
  assert.strictEqual(verifyRegistrationPassword("wrong-pass", expected).authorized, false);
  assert.strictEqual(verifyRegistrationPassword("", expected).authorized, false);
  assert.strictEqual(verifyRegistrationPassword(null, expected).authorized, false);
});

test("Passkey Production: registerNewPasskey adds and updates records correctly", () => {
  let list: PasskeyRecord[] = [];
  const time1 = 100000;
  const time2 = 200000;

  // Add first passkey
  const res1 = registerNewPasskey(list, { id: "passkey-1", deviceName: "My MacBook", publicKey: "PUB1" }, time1);
  assert.strictEqual(res1.added, true);
  assert.strictEqual(res1.updatedPasskeys.length, 1);
  assert.strictEqual(res1.updatedPasskeys[0].deviceName, "My MacBook");
  assert.strictEqual(res1.updatedPasskeys[0].createdAt, time1);
  assert.strictEqual(res1.updatedPasskeys[0].lastUsedAt, time1);

  // Add second passkey
  const res2 = registerNewPasskey(res1.updatedPasskeys, { id: "passkey-2", deviceName: "iPhone 16 Pro" }, time2);
  assert.strictEqual(res2.added, true);
  assert.strictEqual(res2.updatedPasskeys.length, 2);

  // Update existing passkey
  const res3 = registerNewPasskey(res2.updatedPasskeys, { id: "passkey-1", deviceName: "Renamed MacBook" }, 300000);
  assert.strictEqual(res3.added, false);
  assert.strictEqual(res3.updatedPasskeys.length, 2);
  const updatedItem = res3.updatedPasskeys.find(p => p.id === "passkey-1");
  assert.strictEqual(updatedItem?.deviceName, "Renamed MacBook");
  assert.strictEqual(updatedItem?.lastUsedAt, 300000);
  assert.strictEqual(updatedItem?.createdAt, time1, "Original createdAt should be preserved");
});

test("Passkey Production: removePasskeyById deletes credentials properly", () => {
  const list: PasskeyRecord[] = [
    { id: "pk-1", deviceName: "Device 1", createdAt: 1000 },
    { id: "pk-2", deviceName: "Device 2", createdAt: 2000 }
  ];

  const res1 = removePasskeyById(list, "pk-1");
  assert.strictEqual(res1.removed, true);
  assert.strictEqual(res1.updatedPasskeys.length, 1);
  assert.strictEqual(res1.updatedPasskeys[0].id, "pk-2");

  const res2 = removePasskeyById(res1.updatedPasskeys, "non-existent-pk");
  assert.strictEqual(res2.removed, false);
  assert.strictEqual(res2.updatedPasskeys.length, 1);
});

test("Passkey Production: updatePasskeyUsage updates timestamp", () => {
  const list: PasskeyRecord[] = [
    { id: "pk-1", deviceName: "Device 1", createdAt: 1000, lastUsedAt: 1000 },
    { id: "pk-2", deviceName: "Device 2", createdAt: 2000, lastUsedAt: 2000 }
  ];

  const updated = updatePasskeyUsage(list, "pk-1", 555555);
  assert.strictEqual(updated.find(p => p.id === "pk-1")?.lastUsedAt, 555555);
  assert.strictEqual(updated.find(p => p.id === "pk-2")?.lastUsedAt, 2000);
});

test("Passkey Production: findPasskeyById returns matching item or undefined", () => {
  const list: PasskeyRecord[] = [
    { id: "pk-apple", deviceName: "MacBook", createdAt: 1000 }
  ];

  assert.ok(findPasskeyById(list, "pk-apple"));
  assert.ok(findPasskeyById(list, "  pk-apple  "));
  assert.strictEqual(findPasskeyById(list, "pk-windows"), undefined);
});

test("Passkey Production: prunePasskeys retains top most recently used passkeys", () => {
  const list: PasskeyRecord[] = [
    { id: "pk-old", deviceName: "Old Device", createdAt: 1000, lastUsedAt: 1000 },
    { id: "pk-newest", deviceName: "New Device", createdAt: 3000, lastUsedAt: 5000 },
    { id: "pk-mid", deviceName: "Mid Device", createdAt: 2000, lastUsedAt: 3000 }
  ];

  const pruned = prunePasskeys(list, 2);
  assert.strictEqual(pruned.length, 2);
  assert.strictEqual(pruned[0].id, "pk-newest");
  assert.strictEqual(pruned[1].id, "pk-mid");
});
