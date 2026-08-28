import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  extractClientFingerprint,
  computeFingerprintHash,
  generateSecureChallenge,
  generatePortalToken,
  verifyPortalToken,
  pollAuthToken,
  registerNewPasskey,
  authenticatePasskeyCredential,
  createAuthSession,
  validateAndRestoreSession,
  createPasskeyAuditEvent,
  appendPasskeyAuditRecord,
  readPasskeyAuditRecords,
  PasskeyRecord,
  PortalTokenData,
  AuthSessionRecord,
  DeviceFingerprint
} from "./passkeyManager";

test("Passkey Pipeline Stage 1: Device Fingerprint Awareness and Deterministic Hashing", () => {
  const fpData1: Partial<DeviceFingerprint> = {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    platform: "MacIntel",
    language: "en-US",
    timezoneOffset: -300,
    screenResolution: "1920x1080",
    hardwareConcurrency: 8
  };

  const hash1 = computeFingerprintHash(fpData1);
  const hash2 = computeFingerprintHash(fpData1);

  assert.ok(hash1.startsWith("fp_"));
  assert.strictEqual(hash1, hash2, "Fingerprint hash must be deterministic for identical device data");

  // Different device parameters produce distinct hashes
  const fpData2: Partial<DeviceFingerprint> = {
    ...fpData1,
    screenResolution: "2560x1440",
    hardwareConcurrency: 12
  };
  const hash3 = computeFingerprintHash(fpData2);
  assert.notStrictEqual(hash1, hash3);
});

test("Passkey Pipeline Stage 2: Portal Token Generation Bound to Device Fingerprint", () => {
  const portalTokens = new Map<string, PortalTokenData>();
  const fp: DeviceFingerprint = {
    userAgent: "Test Browser",
    platform: "Test OS",
    language: "en",
    timezoneOffset: 0,
    screenResolution: "1280x800",
    hardwareConcurrency: 4,
    fingerprintHash: "fp_test_device_42",
    capturedAt: 1700000000000
  };

  const token = generatePortalToken("register", portalTokens, {
    fingerprint: fp,
    ttlMs: 10 * 60 * 1000,
    currentTime: 1700000000000
  });

  assert.ok(portalTokens.has(token));
  const tokenData = portalTokens.get(token)!;
  assert.strictEqual(tokenData.type, "register");
  assert.strictEqual(tokenData.authorized, false);
  assert.strictEqual(tokenData.fingerprint?.fingerprintHash, "fp_test_device_42");
  assert.ok(tokenData.challenge && tokenData.challenge.length >= 16);
});

test("Passkey Pipeline Stage 3 & 4: Biometric Assertion, Registration, and Session Issuance", () => {
  let passkeys: PasskeyRecord[] = [];
  const portalTokens = new Map<string, PortalTokenData>();
  const sessions = new Map<string, AuthSessionRecord>();

  // 1. Generate Portal Token
  const token = generatePortalToken("register", portalTokens);

  // 2. Client completes biometric handshake and registers credential
  const credentialId = "cred_bio_sample_abc123";
  const { updatedPasskeys, added, record } = registerNewPasskey(passkeys, {
    id: credentialId,
    deviceName: "Apple MacBook Touch ID",
    publicKey: "PUBKEY_MOCK",
    biometricVerified: true,
    fingerprint: {
      userAgent: "Macintosh",
      fingerprintHash: "fp_mac_1"
    } as any
  });

  passkeys = updatedPasskeys;
  assert.strictEqual(added, true);
  assert.strictEqual(passkeys.length, 1);
  assert.strictEqual(record.deviceName, "Apple MacBook Touch ID");
  assert.strictEqual(record.biometricVerified, true);

  // 3. Authorize portal token
  const verifyRes = verifyPortalToken(token, true, portalTokens, "meridian_prod_pass");
  assert.strictEqual(verifyRes.success, true);

  // 4. Poll token from editor window
  const pollRes = pollAuthToken(token, portalTokens);
  assert.strictEqual(pollRes.authorized, true);
  assert.strictEqual(pollRes.password, "meridian_prod_pass");

  // 5. Subsequent authentication directly with credentialId
  const authRes = authenticatePasskeyCredential(credentialId, passkeys, "meridian_prod_pass");
  assert.strictEqual(authRes.authorized, true);
  assert.strictEqual(authRes.password, "meridian_prod_pass");
  assert.strictEqual(authRes.matched?.authCount, 2);

  // 6. Issue active session
  const session = createAuthSession(credentialId, record.deviceName, {
    fingerprintHash: "fp_mac_1",
    editorPassword: "meridian_prod_pass"
  });
  sessions.set(session.sessionId, session);
  assert.strictEqual(session.authorized, true);
  assert.strictEqual(session.windowReloadCount, 0);
});

test("Passkey Pipeline Stage 5: Window Closure and Page Reload Session Recovery", () => {
  const sessions = new Map<string, AuthSessionRecord>();
  const initialTime = 1700000000000;

  const session = createAuthSession("cred_touch_1", "MacBook Pro", {
    maxAgeMs: 24 * 60 * 60 * 1000,
    fingerprintHash: "fp_mbp",
    currentTime: initialTime,
    editorPassword: "meridian_super_key"
  });
  sessions.set(session.sessionId, session);

  // Simulate Page Reload #1 (5 minutes later)
  const reload1 = validateAndRestoreSession(session.sessionId, sessions, {
    currentTime: initialTime + 5 * 60 * 1000,
    fingerprintHash: "fp_mbp"
  });
  assert.strictEqual(reload1.valid, true);
  assert.strictEqual(reload1.password, "meridian_super_key");
  assert.strictEqual(reload1.session?.windowReloadCount, 1);

  // Simulate Window Reopening / Reload #2 (3 hours later)
  const reload2 = validateAndRestoreSession(session.sessionId, sessions, {
    currentTime: initialTime + 3 * 60 * 60 * 1000,
    fingerprintHash: "fp_mbp"
  });
  assert.strictEqual(reload2.valid, true);
  assert.strictEqual(reload2.session?.windowReloadCount, 2);

  // Simulate Inactivity Expiration (after 6 hours idle with 4-hour maxIdle)
  const reload3 = validateAndRestoreSession(session.sessionId, sessions, {
    currentTime: initialTime + 3 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000,
    maxIdleMs: 4 * 60 * 60 * 1000
  });
  assert.strictEqual(reload3.valid, false);
  assert.ok(reload3.error?.includes("inactivity"));
});

test("Passkey Pipeline Stage 6 & 7: End-to-End Audit Journaling Trail", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-e2e-audit-"));

  try {
    const pipelineSteps = [
      createPasskeyAuditEvent("fingerprint_detected", "info", {
        timestamp: 100,
        details: { fingerprintHash: "fp_test_dev" }
      }),
      createPasskeyAuditEvent("challenge_generated", "info", {
        timestamp: 200,
        details: { challengeLength: 43 }
      }),
      createPasskeyAuditEvent("biometric_asserted", "success", {
        timestamp: 300,
        credentialId: "cred_test_100",
        deviceName: "MacBook Touch ID"
      }),
      createPasskeyAuditEvent("passkey_registered", "success", {
        timestamp: 400,
        credentialId: "cred_test_100",
        deviceName: "MacBook Touch ID"
      }),
      createPasskeyAuditEvent("session_issued", "success", {
        timestamp: 500,
        credentialId: "cred_test_100",
        details: { sessionId: "sess_100" }
      }),
      createPasskeyAuditEvent("session_restored_reload", "success", {
        timestamp: 600,
        credentialId: "cred_test_100",
        details: { sessionId: "sess_100", reloadCount: 1 }
      })
    ];

    // Append all audit steps into the pipeline log
    for (const step of pipelineSteps) {
      appendPasskeyAuditRecord(step, fs, tempDir);
    }

    // Verify all steps are stored in the journal and retrieved in reverse-chronological order
    const records = readPasskeyAuditRecords(fs, tempDir, 50);
    assert.strictEqual(records.length, 6);
    assert.strictEqual(records[0].eventType, "session_restored_reload");
    assert.strictEqual(records[1].eventType, "session_issued");
    assert.strictEqual(records[2].eventType, "passkey_registered");
    assert.strictEqual(records[3].eventType, "biometric_asserted");
    assert.strictEqual(records[4].eventType, "challenge_generated");
    assert.strictEqual(records[5].eventType, "fingerprint_detected");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
