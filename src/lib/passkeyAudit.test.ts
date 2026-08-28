import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  createPasskeyAuditEvent,
  appendPasskeyAuditRecord,
  readPasskeyAuditRecords,
  PasskeyAuditEvent,
  PasskeyAuditEventType
} from "./passkeyManager";

test("Passkey Audit Pipeline: createPasskeyAuditEvent generates complete structured event", () => {
  const now = 1700000000000;
  const event = createPasskeyAuditEvent("biometric_asserted", "success", {
    credentialId: "cred_mac_touch_1",
    deviceName: "MacBook Touch ID",
    token: "tok_xyz_123",
    details: { userVerification: "preferred", hardwareHandshakeMs: 42 },
    ip: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    timestamp: now
  });

  assert.ok(event.eventId.startsWith("audit_1700000000000_"));
  assert.strictEqual(event.eventType, "biometric_asserted");
  assert.strictEqual(event.status, "success");
  assert.strictEqual(event.timestamp, now);
  assert.strictEqual(event.credentialId, "cred_mac_touch_1");
  assert.strictEqual(event.deviceName, "MacBook Touch ID");
  assert.strictEqual(event.token, "tok_xyz_123");
  assert.strictEqual(event.ip, "127.0.0.1");
  assert.strictEqual(event.details?.hardwareHandshakeMs, 42);
});

test("Passkey Audit Pipeline: supports all defined pipeline audit event types", () => {
  const types: PasskeyAuditEventType[] = [
    "challenge_generated",
    "fingerprint_detected",
    "biometric_asserted",
    "passkey_registered",
    "passkey_authenticated",
    "passkey_revoked",
    "portal_token_generated",
    "portal_token_verified",
    "portal_token_polled",
    "session_issued",
    "session_restored_reload",
    "session_expired",
    "session_revoked",
    "persistence_sync",
    "tamper_detected",
    "error_logged"
  ];

  for (const t of types) {
    const ev = createPasskeyAuditEvent(t, "info", { details: { testType: t } });
    assert.strictEqual(ev.eventType, t);
    assert.strictEqual(ev.status, "info");
    assert.strictEqual(ev.details?.testType, t);
  }
});

test("Passkey Audit Pipeline: appendPasskeyAuditRecord and readPasskeyAuditRecords write and read from storage", () => {
  // Create a temporary isolated test directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-audit-test-"));

  try {
    const event1 = createPasskeyAuditEvent("fingerprint_detected", "info", {
      timestamp: 1000,
      details: { hash: "fp_1" }
    });
    const event2 = createPasskeyAuditEvent("passkey_registered", "success", {
      timestamp: 2000,
      credentialId: "cred_test_1",
      deviceName: "Test Key"
    });
    const event3 = createPasskeyAuditEvent("session_restored_reload", "success", {
      timestamp: 3000,
      details: { reloadCount: 1 }
    });

    const ok1 = appendPasskeyAuditRecord(event1, fs, tempDir);
    const ok2 = appendPasskeyAuditRecord(event2, fs, tempDir);
    const ok3 = appendPasskeyAuditRecord(event3, fs, tempDir);

    assert.strictEqual(ok1, true);
    assert.strictEqual(ok2, true);
    assert.strictEqual(ok3, true);

    // Verify files were created
    const journalFile = path.join(tempDir, "passkey_audit_journal.jsonl");
    const recordsFile = path.join(tempDir, "passkey_audit_records.json");
    assert.strictEqual(fs.existsSync(journalFile), true);
    assert.strictEqual(fs.existsSync(recordsFile), true);

    // Verify JSONL line count
    const lines = fs.readFileSync(journalFile, "utf-8").trim().split("\n");
    assert.strictEqual(lines.length, 3);

    // Read back records
    const records = readPasskeyAuditRecords(fs, tempDir, 10);
    assert.strictEqual(records.length, 3);
    // Most recent event first
    assert.strictEqual(records[0].eventType, "session_restored_reload");
    assert.strictEqual(records[1].eventType, "passkey_registered");
    assert.strictEqual(records[2].eventType, "fingerprint_detected");

    // Test limit constraint
    const limited = readPasskeyAuditRecords(fs, tempDir, 2);
    assert.strictEqual(limited.length, 2);
  } finally {
    // Clean up temporary test files
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
