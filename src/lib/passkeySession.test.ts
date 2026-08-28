import { test } from "node:test";
import assert from "node:assert";
import {
  createAuthSession,
  validateAndRestoreSession,
  touchSessionActivity,
  revokeAuthSession,
  cleanExpiredSessions,
  AuthSessionRecord
} from "./passkeyManager";

test("Passkey Session Pipeline: createAuthSession initializes complete session record", () => {
  const now = 1700000000000;
  const session = createAuthSession("cred_touch_id_99", "MacBook Pro Touch ID", {
    maxAgeMs: 12 * 60 * 60 * 1000,
    fingerprintHash: "fp_a1b2c3d4",
    currentTime: now,
    editorPassword: "super_secret_pwd"
  });

  assert.ok(session.sessionId.startsWith("sess_"));
  assert.strictEqual(session.credentialId, "cred_touch_id_99");
  assert.strictEqual(session.deviceName, "MacBook Pro Touch ID");
  assert.strictEqual(session.issuedAt, now);
  assert.strictEqual(session.expiresAt, now + 12 * 60 * 60 * 1000);
  assert.strictEqual(session.lastActiveAt, now);
  assert.strictEqual(session.fingerprintHash, "fp_a1b2c3d4");
  assert.strictEqual(session.authorized, true);
  assert.strictEqual(session.windowReloadCount, 0);
  assert.strictEqual(session.editorPassword, "super_secret_pwd");
});

test("Passkey Session Pipeline: validateAndRestoreSession handles page reloads and increments reload count", () => {
  const t0 = 1700000000000;
  const sessions = new Map<string, AuthSessionRecord>();
  const initialSession = createAuthSession("cred_face_id_88", "iPad Pro Face ID", {
    maxAgeMs: 24 * 60 * 60 * 1000,
    fingerprintHash: "fp_ipad_123",
    currentTime: t0,
    editorPassword: "meridian_custom_pwd"
  });
  sessions.set(initialSession.sessionId, initialSession);

  // Reload 1 (e.g. 10 minutes later)
  const t1 = t0 + 10 * 60 * 1000;
  const restore1 = validateAndRestoreSession(initialSession.sessionId, sessions, {
    currentTime: t1,
    fingerprintHash: "fp_ipad_123"
  });

  assert.strictEqual(restore1.valid, true);
  assert.strictEqual(restore1.password, "meridian_custom_pwd");
  assert.strictEqual(restore1.session?.windowReloadCount, 1);
  assert.strictEqual(restore1.session?.lastActiveAt, t1);

  // Reload 2 (e.g. 2 hours later)
  const t2 = t0 + 2 * 60 * 60 * 1000;
  const restore2 = validateAndRestoreSession(initialSession.sessionId, sessions, {
    currentTime: t2,
    fingerprintHash: "fp_ipad_123"
  });

  assert.strictEqual(restore2.valid, true);
  assert.strictEqual(restore2.session?.windowReloadCount, 2);
  assert.strictEqual(restore2.session?.lastActiveAt, t2);
});

test("Passkey Session Pipeline: validateAndRestoreSession rejects invalid or missing session IDs", () => {
  const sessions = new Map<string, AuthSessionRecord>();

  assert.strictEqual(validateAndRestoreSession("", sessions).valid, false);
  assert.strictEqual(validateAndRestoreSession(null, sessions).valid, false);
  assert.strictEqual(validateAndRestoreSession(undefined, sessions).valid, false);
  assert.strictEqual(validateAndRestoreSession("sess_non_existent", sessions).valid, false);
});

test("Passkey Session Pipeline: validateAndRestoreSession enforces total TTL expiration", () => {
  const t0 = 1700000000000;
  const ttl = 60 * 60 * 1000; // 1 hour
  const sessions = new Map<string, AuthSessionRecord>();
  const session = createAuthSession("cred_win_hello", "Windows Hello", {
    maxAgeMs: ttl,
    currentTime: t0
  });
  sessions.set(session.sessionId, session);

  // Valid before expiry
  assert.strictEqual(validateAndRestoreSession(session.sessionId, sessions, { currentTime: t0 + 30 * 60 * 1000 }).valid, true);

  // Expired 1 second after TTL
  const expiredResult = validateAndRestoreSession(session.sessionId, sessions, { currentTime: t0 + ttl + 1000 });
  assert.strictEqual(expiredResult.valid, false);
  assert.ok(expiredResult.error?.includes("expired"));
  // Session must be purged from map
  assert.strictEqual(sessions.has(session.sessionId), false);
});

test("Passkey Session Pipeline: validateAndRestoreSession enforces inactivity idle timeouts", () => {
  const t0 = 1700000000000;
  const sessions = new Map<string, AuthSessionRecord>();
  const session = createAuthSession("cred_touch_id", "MacBook Touch ID", {
    maxAgeMs: 24 * 60 * 60 * 1000,
    currentTime: t0
  });
  sessions.set(session.sessionId, session);

  const maxIdle = 30 * 60 * 1000; // 30 minutes idle limit

  // Valid after 20 minutes (within idle limit)
  const okResult = validateAndRestoreSession(session.sessionId, sessions, {
    currentTime: t0 + 20 * 60 * 1000,
    maxIdleMs: maxIdle
  });
  assert.strictEqual(okResult.valid, true);

  // Now idle for 35 minutes since lastActiveAt (t0 + 20m)
  const idleExpired = validateAndRestoreSession(session.sessionId, sessions, {
    currentTime: t0 + 20 * 60 * 1000 + 35 * 60 * 1000,
    maxIdleMs: maxIdle
  });
  assert.strictEqual(idleExpired.valid, false);
  assert.ok(idleExpired.error?.includes("inactivity"));
});

test("Passkey Session Pipeline: touchSessionActivity updates active timestamp", () => {
  const t0 = 1700000000000;
  const sessions = new Map<string, AuthSessionRecord>();
  const session = createAuthSession("cred_1", "Device 1", { currentTime: t0 });
  sessions.set(session.sessionId, session);

  const t1 = t0 + 15 * 60 * 1000;
  const touched = touchSessionActivity(session.sessionId, sessions, t1);
  assert.strictEqual(touched, true);
  assert.strictEqual(sessions.get(session.sessionId)?.lastActiveAt, t1);

  // Non-existent session returns false
  assert.strictEqual(touchSessionActivity("sess_fake", sessions, t1), false);
});

test("Passkey Session Pipeline: revokeAuthSession removes session cleanly", () => {
  const sessions = new Map<string, AuthSessionRecord>();
  const session = createAuthSession("cred_1", "Device 1");
  sessions.set(session.sessionId, session);

  assert.strictEqual(revokeAuthSession(session.sessionId, sessions), true);
  assert.strictEqual(sessions.has(session.sessionId), false);
  assert.strictEqual(revokeAuthSession(session.sessionId, sessions), false);
});

test("Passkey Session Pipeline: cleanExpiredSessions sweeps expired sessions", () => {
  const t0 = 1700000000000;
  const sessions = new Map<string, AuthSessionRecord>();

  const sess1 = createAuthSession("c1", "D1", { maxAgeMs: 1000, currentTime: t0 });
  const sess2 = createAuthSession("c2", "D2", { maxAgeMs: 5000, currentTime: t0 });
  const sess3 = createAuthSession("c3", "D3", { maxAgeMs: 10000, currentTime: t0 });

  sessions.set(sess1.sessionId, sess1);
  sessions.set(sess2.sessionId, sess2);
  sessions.set(sess3.sessionId, sess3);

  // Clean at t0 + 3000ms -> sess1 expired, sess2 and sess3 active
  const cleaned = cleanExpiredSessions(sessions, t0 + 3000);
  assert.strictEqual(cleaned, 1);
  assert.strictEqual(sessions.has(sess1.sessionId), false);
  assert.strictEqual(sessions.has(sess2.sessionId), true);
  assert.strictEqual(sessions.has(sess3.sessionId), true);
});
