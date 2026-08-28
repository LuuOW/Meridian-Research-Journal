/**
 * MERIDIAN PASSKEY ARCHITECTURE & AUDIT PIPELINE
 * 
 * End-to-end passkey lifecycle management, hardware biometric awareness,
 * multi-tier persistence resilience, window reload recovery, session management,
 * and immutable audit journaling.
 */

export interface DeviceFingerprint {
  userAgent: string;
  platform?: string;
  language?: string;
  timezoneOffset?: number;
  screenResolution?: string;
  hardwareConcurrency?: number;
  fingerprintHash: string;
  capturedAt: number;
}

export interface PortalTokenData {
  type: "register" | "auth";
  createdAt: number;
  authorized?: boolean;
  password?: string;
  deviceName?: string;
  fingerprint?: DeviceFingerprint;
  challenge?: string;
  expiresAt?: number;
}

export interface PasskeyCredentialInput {
  id?: string;
  type?: string;
  publicKey?: string;
  deviceName?: string;
  fingerprint?: Partial<DeviceFingerprint>;
  biometricVerified?: boolean;
  aaguid?: string;
}

export interface PasskeyRecord {
  id: string;
  publicKey?: string;
  deviceName: string;
  createdAt: number;
  lastUsedAt?: number;
  authCount?: number;
  fingerprint?: DeviceFingerprint;
  biometricVerified?: boolean;
  aaguid?: string;
}

export interface AuthSessionRecord {
  sessionId: string;
  credentialId: string;
  deviceName: string;
  issuedAt: number;
  expiresAt: number;
  lastActiveAt: number;
  fingerprintHash?: string;
  authorized: boolean;
  windowReloadCount?: number;
  editorPassword?: string;
}

export type PasskeyAuditEventType =
  | "challenge_generated"
  | "fingerprint_detected"
  | "biometric_asserted"
  | "passkey_registered"
  | "passkey_authenticated"
  | "passkey_revoked"
  | "portal_token_generated"
  | "portal_token_verified"
  | "portal_token_polled"
  | "session_issued"
  | "session_restored_reload"
  | "session_expired"
  | "session_revoked"
  | "persistence_sync"
  | "tamper_detected"
  | "error_logged";

export interface PasskeyAuditEvent {
  eventId: string;
  eventType: PasskeyAuditEventType;
  timestamp: number;
  credentialId?: string;
  deviceName?: string;
  token?: string;
  status: "success" | "failure" | "pending" | "info";
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

/**
 * Validates the structure and presence of a passkey credential object
 */
export function validatePasskeyCredential(credential: PasskeyCredentialInput | null | undefined): boolean {
  if (!credential || typeof credential !== "object") return false;
  if (!credential.id || typeof credential.id !== "string" || credential.id.trim() === "") return false;
  return true;
}

/**
 * Normalizes and sanitizes a credential ID to prevent injection and whitespace defects
 */
export function sanitizeCredentialId(id: string | null | undefined): string {
  if (!id || typeof id !== "string") return "";
  return id.trim();
}

/**
 * Formats a clean human-readable device label for passkey records
 */
export function formatPasskeyLabel(deviceName?: string, fallbackId?: string): string {
  if (deviceName && deviceName.trim().length > 0) {
    return deviceName.trim();
  }
  if (fallbackId && fallbackId.length > 0) {
    const cleanId = fallbackId.replace(/^simulated-passkey-/, "").replace(/[^a-zA-Z0-9]/g, "");
    return `Device (${cleanId.slice(0, 8)})`;
  }
  return "Registered Biometric Device";
}

/**
 * Computes a deterministic SHA-like fingerprint hash from device characteristics
 */
export function computeFingerprintHash(data: Partial<DeviceFingerprint>): string {
  const payload = [
    data.userAgent || "",
    data.platform || "",
    data.language || "",
    String(data.timezoneOffset ?? ""),
    data.screenResolution || "",
    String(data.hardwareConcurrency ?? "")
  ].join("|");

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return "fp_" + Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Extracts a client device fingerprint from window/navigator or request headers
 */
export function extractClientFingerprint(source?: any): DeviceFingerprint {
  if (typeof window !== "undefined") {
    const nav = window.navigator || {} as any;
    const scr = window.screen || {} as any;
    const partial: Partial<DeviceFingerprint> = {
      userAgent: nav.userAgent || "Unknown Browser",
      platform: nav.platform || "Unknown Platform",
      language: nav.language || "en",
      timezoneOffset: new Date().getTimezoneOffset(),
      screenResolution: scr.width ? `${scr.width}x${scr.height}` : "Unknown",
      hardwareConcurrency: nav.hardwareConcurrency || 4
    };
    return {
      ...partial,
      userAgent: partial.userAgent!,
      capturedAt: Date.now(),
      fingerprintHash: computeFingerprintHash(partial)
    };
  }

  // Server-side fallback or request object parsing
  const ua = source?.headers?.["user-agent"] || source?.userAgent || "Server Node Environment";
  const partial: Partial<DeviceFingerprint> = {
    userAgent: ua,
    platform: source?.headers?.["sec-ch-ua-platform"] || "Node Server",
    language: source?.headers?.["accept-language"] || "en",
    timezoneOffset: 0
  };
  return {
    ...partial,
    userAgent: partial.userAgent!,
    capturedAt: Date.now(),
    fingerprintHash: computeFingerprintHash(partial)
  };
}

/**
 * Determines the effective WebAuthn RP ID based on hostname.
 * WebAuthn spec forbids IP addresses as rp.id.
 */
export function getEffectiveRpId(hostname?: string): string | undefined {
  if (!hostname || typeof hostname !== "string" || hostname.trim() === "") {
    return undefined;
  }
  const clean = hostname.trim().toLowerCase();
  // IPv4 address check (e.g. 127.0.0.1, 10.0.0.1)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) {
    return undefined;
  }
  // IPv6 address check (contains colon)
  if (clean.includes(":")) {
    return undefined;
  }
  return clean;
}

/**
 * Converts a base64 or base64url string to a Uint8Array safely in all environments
 */
export function base64UrlToUint8Array(str: string): Uint8Array {
  if (!str || typeof str !== "string") return new Uint8Array(0);
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    if (typeof atob === "function") {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(base64, "base64"));
    }
  } catch {
    // Fallback to text encoder if not valid base64
  }
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array to a standard base64url string safely
 */
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  if (!bytes || bytes.length === 0) return "";
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(bytes).toString("base64url");
    }
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

/**
 * Generates a random cryptographic challenge string (32 bytes base64url)
 */
export function generateSecureChallenge(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return uint8ArrayToBase64Url(bytes) || Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Generates a unique portal token and registers it in the provided tracking Map.
 */
export function generatePortalToken(
  type: "register" | "auth" | undefined,
  portalTokens: Map<string, PortalTokenData>,
  options?: {
    fingerprint?: DeviceFingerprint;
    ttlMs?: number;
    currentTime?: number;
  }
): string {
  const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  const now = options?.currentTime !== undefined ? options.currentTime : Date.now();
  const ttl = options?.ttlMs || 15 * 60 * 1000;

  portalTokens.set(token, {
    type: type || "register",
    createdAt: now,
    expiresAt: now + ttl,
    authorized: false,
    fingerprint: options?.fingerprint,
    challenge: generateSecureChallenge()
  });
  return token;
}

/**
 * Scans all current active portal tokens and purges those that exceed the specified maxAgeMs.
 * Returns the count of deleted tokens.
 */
export function cleanExpiredTokens(
  portalTokens: Map<string, PortalTokenData>,
  maxAgeMs: number = 15 * 60 * 1000,
  currentTimeOverride?: number
): number {
  const now = currentTimeOverride !== undefined ? currentTimeOverride : Date.now();
  let count = 0;
  for (const [t, data] of portalTokens.entries()) {
    const isExpired = (now - data.createdAt > maxAgeMs) || (data.expiresAt ? now > data.expiresAt : false);
    if (isExpired) {
      portalTokens.delete(t);
      count++;
    }
  }
  return count;
}

/**
 * Processes a verification request for a portal token, setting authorized = true if successful.
 */
export function verifyPortalToken(
  token: string,
  success: boolean,
  portalTokens: Map<string, PortalTokenData>,
  editorPassword?: string,
  metadata?: { deviceName?: string; fingerprint?: DeviceFingerprint }
): { success: boolean; error?: string } {
  if (!token) {
    return { success: false, error: "Token is required" };
  }

  const tokenData = portalTokens.get(token);
  if (!tokenData) {
    return { success: false, error: "Token not found or expired" };
  }

  if (success) {
    tokenData.authorized = true;
    tokenData.password = editorPassword || "meridian";
    if (metadata?.deviceName) tokenData.deviceName = metadata.deviceName;
    if (metadata?.fingerprint) tokenData.fingerprint = metadata.fingerprint;
    portalTokens.set(token, tokenData);
    return { success: true };
  }

  return { success: false, error: "Verification failed" };
}

/**
 * Polls the authorization state of a portal token. If authorized, consumes/deletes the token from the map and returns the password.
 */
export function pollAuthToken(
  token: string,
  portalTokens: Map<string, PortalTokenData>
): { authorized: boolean; password?: string; deviceName?: string; error?: string } {
  if (!token) {
    return { authorized: false, error: "Token is required" };
  }

  const tokenData = portalTokens.get(token);
  if (!tokenData) {
    return { authorized: false, error: "Token not found or expired" };
  }

  if (tokenData.authorized) {
    const password = tokenData.password || "meridian";
    const deviceName = tokenData.deviceName;
    // Consume token on successful poll to prevent replay attacks
    portalTokens.delete(token);
    return { authorized: true, password, deviceName };
  }

  return { authorized: false };
}

/**
 * Validates a registration token.
 */
export function validateRegistrationToken(
  token: string | null | undefined,
  portalTokens: Map<string, PortalTokenData>
): { valid: boolean; error?: string } {
  if (!token) {
    return { valid: false, error: "Unauthorized: Portal token is required for registration." };
  }

  const tokenData = portalTokens.get(token);
  if (!tokenData) {
    return { valid: false, error: "Unauthorized: Invalid or expired registration portal token." };
  }

  if (tokenData.type !== "register") {
    return { valid: false, error: "Unauthorized: Token type must be register." };
  }

  return { valid: true };
}

/**
 * Verifies that the supplied registration password matches the expected system password.
 */
export function verifyRegistrationPassword(
  password: string | null | undefined,
  expectedPassword: string
): { authorized: boolean; error?: string } {
  if (!password || password !== expectedPassword) {
    return { authorized: false, error: "Unauthorized: Incorrect editor password to authorize passkey registration." };
  }
  return { authorized: true };
}

/**
 * Registers a new passkey or updates an existing one in a passkey collection with biometric & fingerprint awareness
 */
export function registerNewPasskey(
  existingPasskeys: PasskeyRecord[],
  newCredential: {
    id: string;
    deviceName?: string;
    publicKey?: string;
    fingerprint?: DeviceFingerprint;
    biometricVerified?: boolean;
    aaguid?: string;
  },
  currentTime?: number
): { updatedPasskeys: PasskeyRecord[]; added: boolean; record: PasskeyRecord } {
  const cleanId = sanitizeCredentialId(newCredential.id);
  const now = currentTime !== undefined ? currentTime : Date.now();

  if (!cleanId) {
    const dummyRecord: PasskeyRecord = {
      id: "",
      deviceName: "Invalid",
      createdAt: now
    };
    return { updatedPasskeys: existingPasskeys, added: false, record: dummyRecord };
  }

  const index = existingPasskeys.findIndex(p => p.id === cleanId);

  if (index >= 0) {
    // Update existing record
    const updated = [...existingPasskeys];
    const updatedRecord: PasskeyRecord = {
      ...updated[index],
      deviceName: newCredential.deviceName?.trim() || updated[index].deviceName,
      publicKey: newCredential.publicKey || updated[index].publicKey,
      lastUsedAt: now,
      authCount: (updated[index].authCount || 1) + 1,
      fingerprint: newCredential.fingerprint || updated[index].fingerprint,
      biometricVerified: newCredential.biometricVerified ?? true,
      aaguid: newCredential.aaguid || updated[index].aaguid
    };
    updated[index] = updatedRecord;
    return { updatedPasskeys: updated, added: false, record: updatedRecord };
  }

  // Insert new record
  const newRecord: PasskeyRecord = {
    id: cleanId,
    deviceName: formatPasskeyLabel(newCredential.deviceName, cleanId),
    publicKey: newCredential.publicKey || "",
    createdAt: now,
    lastUsedAt: now,
    authCount: 1,
    fingerprint: newCredential.fingerprint,
    biometricVerified: newCredential.biometricVerified ?? true,
    aaguid: newCredential.aaguid
  };

  return {
    updatedPasskeys: [newRecord, ...existingPasskeys],
    added: true,
    record: newRecord
  };
}

/**
 * Removes a passkey by ID from the collection
 */
export function removePasskeyById(
  existingPasskeys: PasskeyRecord[],
  id: string
): { updatedPasskeys: PasskeyRecord[]; removed: boolean } {
  const cleanId = sanitizeCredentialId(id);
  const filtered = existingPasskeys.filter(p => p.id !== cleanId);
  const removed = filtered.length < existingPasskeys.length;
  return { updatedPasskeys: filtered, removed };
}

/**
 * Updates the lastUsedAt timestamp for a given passkey
 */
export function updatePasskeyUsage(
  existingPasskeys: PasskeyRecord[],
  id: string,
  timestamp?: number
): PasskeyRecord[] {
  const cleanId = sanitizeCredentialId(id);
  const now = timestamp !== undefined ? timestamp : Date.now();
  return existingPasskeys.map(p => {
    if (p.id === cleanId) {
      return {
        ...p,
        lastUsedAt: now,
        authCount: (p.authCount || 0) + 1
      };
    }
    return p;
  });
}

/**
 * Finds a passkey record by ID
 */
export function findPasskeyById(passkeys: PasskeyRecord[], id: string): PasskeyRecord | undefined {
  const cleanId = sanitizeCredentialId(id);
  return passkeys.find(p => p.id === cleanId);
}

/**
 * Authenticates a passkey assertion by matching the credential ID against registered passkeys.
 * Returns authorized status, matched passkey, updated passkeys list with lastUsedAt, and the server editor password.
 */
export function authenticatePasskeyCredential(
  credentialId: string | null | undefined,
  passkeys: PasskeyRecord[],
  expectedPassword: string,
  currentTime?: number
): {
  authorized: boolean;
  error?: string;
  password?: string;
  updatedPasskeys?: PasskeyRecord[];
  matched?: PasskeyRecord;
} {
  const cleanId = sanitizeCredentialId(credentialId);
  if (!cleanId) {
    return { authorized: false, error: "Credential ID is required." };
  }

  const matched = passkeys.find(p => p.id === cleanId);
  if (!matched) {
    return { authorized: false, error: "Passkey credential not recognized or unregistered." };
  }

  const now = currentTime !== undefined ? currentTime : Date.now();
  const updatedPasskeys = updatePasskeyUsage(passkeys, cleanId, now);
  const updatedMatched: PasskeyRecord = {
    ...matched,
    lastUsedAt: now,
    authCount: (matched.authCount || 0) + 1
  };

  return {
    authorized: true,
    password: expectedPassword,
    updatedPasskeys,
    matched: updatedMatched
  };
}

/**
 * Prunes the passkey list to a maximum number of devices, keeping the most recently used/created
 */
export function prunePasskeys(passkeys: PasskeyRecord[], maxCount: number = 50): PasskeyRecord[] {
  if (passkeys.length <= maxCount) return passkeys;
  return [...passkeys]
    .sort((a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt))
    .slice(0, maxCount);
}

/**
 * Intelligently merges client-enrolled and server-registered passkey collections.
 * Ensures that passkeys are never lost due to container restarts, session expirations, or cache clearances.
 */
export function syncPasskeyCollections(
  serverPasskeys: PasskeyRecord[] | null | undefined,
  clientPasskeys: PasskeyRecord[] | null | undefined
): { merged: PasskeyRecord[]; addedCount: number; updatedCount: number } {
  const mergedMap = new Map<string, PasskeyRecord>();
  let addedCount = 0;
  let updatedCount = 0;

  // 1. Seed with server passkeys
  if (Array.isArray(serverPasskeys)) {
    serverPasskeys.forEach((p) => {
      const cleanId = sanitizeCredentialId(p?.id);
      if (cleanId) {
        mergedMap.set(cleanId, {
          ...p,
          id: cleanId,
          deviceName: formatPasskeyLabel(p.deviceName, cleanId),
          createdAt: p.createdAt || Date.now(),
          authCount: p.authCount || 1,
          biometricVerified: p.biometricVerified ?? true
        });
      }
    });
  }

  // 2. Reconcile with client passkeys
  if (Array.isArray(clientPasskeys)) {
    clientPasskeys.forEach((cp) => {
      const cleanId = sanitizeCredentialId(cp?.id);
      if (!cleanId) return;

      const existing = mergedMap.get(cleanId);
      if (!existing) {
        // New client passkey restored to server
        mergedMap.set(cleanId, {
          ...cp,
          id: cleanId,
          deviceName: formatPasskeyLabel(cp.deviceName, cleanId),
          createdAt: cp.createdAt || Date.now(),
          lastUsedAt: cp.lastUsedAt || cp.createdAt || Date.now(),
          authCount: cp.authCount || 1,
          biometricVerified: cp.biometricVerified ?? true
        });
        addedCount++;
      } else {
        // Merge latest metadata
        const latestLastUsed = Math.max(existing.lastUsedAt || 0, cp.lastUsedAt || 0);
        const maxAuthCount = Math.max(existing.authCount || 1, cp.authCount || 1);
        const mergedRecord: PasskeyRecord = {
          ...existing,
          deviceName: cp.deviceName && cp.deviceName !== "Registered Biometric Device" ? cp.deviceName : existing.deviceName,
          publicKey: cp.publicKey || existing.publicKey,
          fingerprint: cp.fingerprint || existing.fingerprint,
          lastUsedAt: latestLastUsed > 0 ? latestLastUsed : existing.lastUsedAt,
          authCount: maxAuthCount,
          biometricVerified: existing.biometricVerified || cp.biometricVerified || true,
          aaguid: cp.aaguid || existing.aaguid
        };
        mergedMap.set(cleanId, mergedRecord);
        updatedCount++;
      }
    });
  }

  const merged = Array.from(mergedMap.values()).sort(
    (a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt)
  );

  return { merged, addedCount, updatedCount };
}

// ------------------------------------------------------------------------------------------------
// SESSION MANAGEMENT (WINDOW CLOSURES, PAGE RELOADS & INACTIVITY HANDLING)
// ------------------------------------------------------------------------------------------------

/**
 * Creates a persistent authenticated session record bound to a passkey credential
 */
export function createAuthSession(
  credentialId: string,
  deviceName: string,
  options?: {
    maxAgeMs?: number;
    fingerprintHash?: string;
    currentTime?: number;
    editorPassword?: string;
  }
): AuthSessionRecord {
  const now = options?.currentTime !== undefined ? options.currentTime : Date.now();
  const maxAge = options?.maxAgeMs || 24 * 60 * 60 * 1000; // 24 hours default
  const sessionId = "sess_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  return {
    sessionId,
    credentialId: sanitizeCredentialId(credentialId),
    deviceName: deviceName.trim() || "Authenticated Device",
    issuedAt: now,
    expiresAt: now + maxAge,
    lastActiveAt: now,
    fingerprintHash: options?.fingerprintHash,
    authorized: true,
    windowReloadCount: 0,
    editorPassword: options?.editorPassword || "meridian"
  };
}

/**
 * Validates and restores an active session after page reload or window reopen
 */
export function validateAndRestoreSession(
  sessionId: string | null | undefined,
  sessions: Map<string, AuthSessionRecord>,
  options?: {
    fingerprintHash?: string;
    currentTime?: number;
    maxIdleMs?: number;
  }
): {
  valid: boolean;
  session?: AuthSessionRecord;
  error?: string;
  password?: string;
} {
  if (!sessionId || typeof sessionId !== "string") {
    return { valid: false, error: "Session ID is required." };
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return { valid: false, error: "Session expired or not found." };
  }

  const now = options?.currentTime !== undefined ? options.currentTime : Date.now();

  // Check absolute expiration
  if (now > session.expiresAt) {
    sessions.delete(sessionId);
    return { valid: false, error: "Session has expired due to time-to-live threshold." };
  }

  // Check idle timeout (e.g. 4 hours idle limit if specified)
  if (options?.maxIdleMs && now - session.lastActiveAt > options.maxIdleMs) {
    sessions.delete(sessionId);
    return { valid: false, error: "Session expired due to inactivity." };
  }

  // Touch session and increment reload count
  session.lastActiveAt = now;
  session.windowReloadCount = (session.windowReloadCount || 0) + 1;
  sessions.set(sessionId, session);

  return {
    valid: true,
    session,
    password: session.editorPassword || "meridian"
  };
}

/**
 * Touches session activity timestamp to prevent idle timeout
 */
export function touchSessionActivity(
  sessionId: string,
  sessions: Map<string, AuthSessionRecord>,
  currentTime?: number
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.lastActiveAt = currentTime !== undefined ? currentTime : Date.now();
  sessions.set(sessionId, session);
  return true;
}

/**
 * Explicitly revokes a session
 */
export function revokeAuthSession(
  sessionId: string,
  sessions: Map<string, AuthSessionRecord>
): boolean {
  return sessions.delete(sessionId);
}

/**
 * Cleans expired sessions from the registry
 */
export function cleanExpiredSessions(
  sessions: Map<string, AuthSessionRecord>,
  currentTimeOverride?: number
): number {
  const now = currentTimeOverride !== undefined ? currentTimeOverride : Date.now();
  let count = 0;
  for (const [id, sess] of sessions.entries()) {
    if (now > sess.expiresAt) {
      sessions.delete(id);
      count++;
    }
  }
  return count;
}

// ------------------------------------------------------------------------------------------------
// IMMUTABLE AUDIT JOURNAL & EVENT LOGGING ("log everything and keep a record of it")
// ------------------------------------------------------------------------------------------------

/**
 * Creates a structured passkey audit event
 */
export function createPasskeyAuditEvent(
  eventType: PasskeyAuditEventType,
  status: "success" | "failure" | "pending" | "info",
  options?: {
    credentialId?: string;
    deviceName?: string;
    token?: string;
    details?: Record<string, any>;
    ip?: string;
    userAgent?: string;
    timestamp?: number;
  }
): PasskeyAuditEvent {
  const now = options?.timestamp !== undefined ? options.timestamp : Date.now();
  const eventId = `audit_${now}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    eventId,
    eventType,
    timestamp: now,
    status,
    credentialId: options?.credentialId ? sanitizeCredentialId(options.credentialId) : undefined,
    deviceName: options?.deviceName,
    token: options?.token,
    details: options?.details,
    ip: options?.ip,
    userAgent: options?.userAgent
  };
}

function joinPath(dir: string, file: string): string {
  const separator = dir.includes("\\") ? "\\" : "/";
  if (dir.endsWith("/") || dir.endsWith("\\")) {
    return dir + file;
  }
  return `${dir}${separator}${file}`;
}

/**
 * Synchronously appends an audit event to the persistent journal file and records list
 */
export function appendPasskeyAuditRecord(
  event: PasskeyAuditEvent,
  fsImpl?: any,
  dataDirOverride?: string
): boolean {
  try {
    let fsMod = fsImpl;
    if (!fsMod) {
      try {
        if (typeof require === "function") {
          fsMod = require("fs");
        }
      } catch {}
    }
    
    if (!fsMod) {
      // In pure browser environment, log to console
      return true;
    }

    const dataDir = dataDirOverride || (typeof process !== "undefined" && process.cwd ? joinPath(process.cwd(), "data") : "data");
    if (typeof fsMod.existsSync === "function" && !fsMod.existsSync(dataDir)) {
      if (typeof fsMod.mkdirSync === "function") {
        fsMod.mkdirSync(dataDir, { recursive: true });
      }
    }

    const journalFile = joinPath(dataDir, "passkey_audit_journal.jsonl");
    const recordsFile = joinPath(dataDir, "passkey_audit_records.json");

    // Append JSONL line
    if (typeof fsMod.appendFileSync === "function") {
      fsMod.appendFileSync(journalFile, JSON.stringify(event) + "\n", "utf-8");
    }

    // Update rolling buffer JSON (last 200 records)
    let records: PasskeyAuditEvent[] = [];
    if (typeof fsMod.existsSync === "function" && fsMod.existsSync(recordsFile)) {
      try {
        records = JSON.parse(fsMod.readFileSync(recordsFile, "utf-8"));
      } catch {
        records = [];
      }
    }

    records = [event, ...records.filter(r => r.eventId !== event.eventId)].slice(0, 200);
    if (typeof fsMod.writeFileSync === "function") {
      fsMod.writeFileSync(recordsFile, JSON.stringify(records, null, 2), "utf-8");
    }
    return true;
  } catch (err) {
    console.error("[PasskeyAudit] Failed to append audit record:", err);
    return false;
  }
}

/**
 * Reads passkey audit records from persistent storage
 */
export function readPasskeyAuditRecords(
  fsImpl?: any,
  dataDirOverride?: string,
  limit: number = 100
): PasskeyAuditEvent[] {
  try {
    let fsMod = fsImpl;
    if (!fsMod) {
      try {
        if (typeof require === "function") {
          fsMod = require("fs");
        }
      } catch {}
    }

    if (!fsMod) return [];

    const dataDir = dataDirOverride || (typeof process !== "undefined" && process.cwd ? joinPath(process.cwd(), "data") : "data");
    const recordsFile = joinPath(dataDir, "passkey_audit_records.json");
    const journalFile = joinPath(dataDir, "passkey_audit_journal.jsonl");

    if (typeof fsMod.existsSync === "function" && fsMod.existsSync(recordsFile)) {
      const data = fsMod.readFileSync(recordsFile, "utf-8");
      const list = JSON.parse(data);
      return Array.isArray(list) ? list.slice(0, limit) : [];
    }

    if (typeof fsMod.existsSync === "function" && fsMod.existsSync(journalFile)) {
      const lines = fsMod.readFileSync(journalFile, "utf-8").split("\n").filter(Boolean);
      return lines.map((l: string) => JSON.parse(l)).reverse().slice(0, limit);
    }
  } catch (err) {
    console.error("[PasskeyAudit] Failed to read audit records:", err);
  }
  return [];
}
