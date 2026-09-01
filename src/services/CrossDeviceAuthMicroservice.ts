/**
 * MERIDIAN CROSS-DEVICE & MULTI-IP AUTHENTICATION MICROSERVICE
 * 
 * Manages biometric passkeys, cryptographic challenge-response authentication,
 * cross-device portal tokens, seamless IP roaming (Wi-Fi/Cellular/VPN transitions),
 * and persistent session state across devices and browsers.
 */

import fs from "fs";
import path from "path";
import {
  IMicroservice,
  ServiceHealth,
  SessionRoamContext
} from "./types";
import {
  PasskeyRecord,
  AuthSessionRecord,
  PortalTokenData,
  PasskeyAuditEvent,
  DeviceFingerprint,
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
  authenticatePasskeyCredential,
  syncPasskeyCollections,
  createAuthSession,
  validateAndRestoreSession,
  touchSessionActivity,
  revokeAuthSession,
  cleanExpiredSessions,
  createPasskeyAuditEvent,
  appendPasskeyAuditRecord,
  readPasskeyAuditRecords,
  computeFingerprintHash,
  extractClientFingerprint,
  sanitizeCredentialId,
  getEffectiveRpId
} from "../lib/passkeyManager";

export class CrossDeviceAuthMicroservice implements IMicroservice {
  public readonly serviceName = "CrossDeviceAuthMicroservice";
  public readonly version = "2.5.0";

  private dataDir: string;
  private passkeysFile: string;
  private sessionsFile: string;
  private auditJournalFile: string;

  private startTime: number = Date.now();
  private lastHeartbeat: number = Date.now();

  private passkeys: PasskeyRecord[] = [];
  private activeSessions: Map<string, AuthSessionRecord> = new Map();
  private portalTokens: Map<string, PortalTokenData> = new Map();
  private ipRoamHistory: Map<string, string[]> = new Map(); // sessionId -> string[] of observed IPs

  private expectedPassword: string = "meridian";

  constructor(options?: { baseDir?: string; defaultPassword?: string }) {
    const base = options?.baseDir || process.cwd();
    this.dataDir = path.join(base, "data");
    this.passkeysFile = path.join(this.dataDir, "passkeys.json");
    this.sessionsFile = path.join(this.dataDir, "active_sessions.json");
    this.auditJournalFile = path.join(this.dataDir, "passkey_audit_journal.jsonl");
    if (options?.defaultPassword) {
      this.expectedPassword = options.defaultPassword;
    }
  }

  public setExpectedPassword(pwd: string) {
    if (pwd) this.expectedPassword = pwd;
  }

  public async initialize(): Promise<boolean> {
    try {
      this.ensureDirectories();
      this.loadPasskeysFromDisk();
      this.loadSessionsFromDisk();
      this.cleanExpiredData();
      this.lastHeartbeat = Date.now();
      return true;
    } catch (err) {
      console.error(`[${this.serviceName}] Initialization failed:`, err);
      return false;
    }
  }

  public async getHealth(): Promise<ServiceHealth> {
    this.lastHeartbeat = Date.now();
    return {
      serviceName: this.serviceName,
      status: "healthy",
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastHeartbeat: this.lastHeartbeat,
      version: this.version,
      details: {
        registeredPasskeysCount: this.passkeys.length,
        activeSessionsCount: this.activeSessions.size,
        activePortalTokensCount: this.portalTokens.size,
        totalAuditEventsLogged: this.getAuditEventsCount()
      }
    };
  }

  public async shutdown(): Promise<boolean> {
    this.savePasskeysToDisk();
    this.saveSessionsToDisk();
    return true;
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadPasskeysFromDisk(): void {
    try {
      if (fs.existsSync(this.passkeysFile)) {
        const raw = fs.readFileSync(this.passkeysFile, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.passkeys = list;
        }
      }
    } catch (err) {
      console.warn(`[${this.serviceName}] Error reading passkeys.json:`, err);
    }
  }

  private savePasskeysToDisk(): void {
    try {
      this.ensureDirectories();
      fs.writeFileSync(this.passkeysFile, JSON.stringify(this.passkeys, null, 2), "utf-8");
    } catch (err) {
      console.error(`[${this.serviceName}] Error writing passkeys.json:`, err);
    }
  }

  private loadSessionsFromDisk(): void {
    try {
      if (fs.existsSync(this.sessionsFile)) {
        const raw = fs.readFileSync(this.sessionsFile, "utf-8");
        const list: AuthSessionRecord[] = JSON.parse(raw);
        const now = Date.now();
        this.activeSessions.clear();
        for (const s of list) {
          if (s.expiresAt > now) {
            this.activeSessions.set(s.sessionId, s);
          }
        }
      }
    } catch (err) {
      console.warn(`[${this.serviceName}] Error reading active_sessions.json:`, err);
    }
  }

  private saveSessionsToDisk(): void {
    try {
      this.ensureDirectories();
      const list = Array.from(this.activeSessions.values());
      fs.writeFileSync(this.sessionsFile, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error(`[${this.serviceName}] Error writing active_sessions.json:`, err);
    }
  }

  public cleanExpiredData(): { purgedTokens: number; purgedSessions: number } {
    const purgedTokens = cleanExpiredTokens(this.portalTokens);
    const purgedSessions = cleanExpiredSessions(this.activeSessions);
    if (purgedSessions > 0) {
      this.saveSessionsToDisk();
    }
    return { purgedTokens, purgedSessions };
  }

  // --- PASSKEY MANAGEMENT ---

  public getPasskeys(): PasskeyRecord[] {
    return [...this.passkeys];
  }

  public registerPasskey(
    credential: {
      id: string;
      deviceName?: string;
      publicKey?: string;
      fingerprint?: DeviceFingerprint;
      biometricVerified?: boolean;
      aaguid?: string;
    },
    clientIp?: string
  ): { success: boolean; record: PasskeyRecord; added: boolean } {
    const res = registerNewPasskey(this.passkeys, credential);
    this.passkeys = res.updatedPasskeys;
    this.savePasskeysToDisk();

    const audit = createPasskeyAuditEvent(
      "passkey_registered",
      "success",
      {
        credentialId: credential.id,
        deviceName: res.record.deviceName,
        ip: clientIp,
        details: { biometric: credential.biometricVerified }
      }
    );
    appendPasskeyAuditRecord(audit, fs, this.dataDir);

    return { success: true, record: res.record, added: res.added };
  }

  public removePasskey(id: string, clientIp?: string): { success: boolean; removed: boolean } {
    const res = removePasskeyById(this.passkeys, id);
    this.passkeys = res.updatedPasskeys;
    this.savePasskeysToDisk();

    const audit = createPasskeyAuditEvent(
      "passkey_revoked",
      res.removed ? "success" : "info",
      {
        credentialId: id,
        ip: clientIp
      }
    );
    appendPasskeyAuditRecord(audit, fs, this.dataDir);

    return { success: true, removed: res.removed };
  }

  public authenticate(
    credentialId: string,
    clientIp?: string,
    fingerprint?: DeviceFingerprint
  ): {
    authorized: boolean;
    session?: AuthSessionRecord;
    error?: string;
    matchedPasskey?: PasskeyRecord;
  } {
    const result = authenticatePasskeyCredential(credentialId, this.passkeys, this.expectedPassword);
    if (!result.authorized) {
      const audit = createPasskeyAuditEvent(
        "passkey_authenticated",
        "failure",
        { credentialId, ip: clientIp, details: { error: result.error } }
      );
      appendPasskeyAuditRecord(audit, fs, this.dataDir);
      return { authorized: false, error: result.error };
    }

    if (result.updatedPasskeys) {
      this.passkeys = result.updatedPasskeys;
      this.savePasskeysToDisk();
    }

    // Issue multi-device session
    const session = createAuthSession(
      credentialId,
      result.matched?.deviceName || "Biometric Device",
      {
        fingerprintHash: fingerprint?.fingerprintHash,
        editorPassword: this.expectedPassword
      }
    );
    this.activeSessions.set(session.sessionId, session);
    this.saveSessionsToDisk();

    if (clientIp) {
      this.ipRoamHistory.set(session.sessionId, [clientIp]);
    }

    const audit = createPasskeyAuditEvent(
      "passkey_authenticated",
      "success",
      {
        credentialId,
        deviceName: result.matched?.deviceName,
        ip: clientIp,
        details: { sessionId: session.sessionId }
      }
    );
    appendPasskeyAuditRecord(audit, fs, this.dataDir);

    return {
      authorized: true,
      session,
      matchedPasskey: result.matched
    };
  }

  // --- CROSS-DEVICE & CROSS-IP SESSION RESILIENCE ---

  /**
   * Validates an active session with IP roaming tolerance:
   * When user moves between Wi-Fi and 5G cellular, this records the IP transition
   * and preserves authenticated status without dropping the user's editor session.
   */
  public validateSessionWithRoam(
    sessionId: string,
    currentIp?: string,
    fingerprintHash?: string
  ): { valid: boolean; session?: AuthSessionRecord; roamContext?: SessionRoamContext; error?: string } {
    const result = validateAndRestoreSession(sessionId, this.activeSessions, {
      fingerprintHash,
      maxIdleMs: 4 * 60 * 60 * 1000 // 4 hours idle limit
    });

    if (!result.valid || !result.session) {
      return { valid: false, error: result.error || "Invalid session" };
    }

    // IP Roaming tracking
    const observedIps = this.ipRoamHistory.get(sessionId) || [];
    const origIp = observedIps[0] || currentIp || "unknown";
    const isRoam = Boolean(currentIp && observedIps.length > 0 && !observedIps.includes(currentIp));

    if (currentIp && !observedIps.includes(currentIp)) {
      observedIps.push(currentIp);
      this.ipRoamHistory.set(sessionId, observedIps);
    }

    const roamContext: SessionRoamContext = {
      sessionId,
      credentialId: result.session.credentialId,
      deviceName: result.session.deviceName,
      originalIp: origIp,
      currentIp: currentIp || origIp,
      ipRoamDetected: isRoam,
      fingerprintHash: fingerprintHash || result.session.fingerprintHash || "",
      userAgent: "Browser Client",
      authorized: result.session.authorized,
      lastActiveAt: result.session.lastActiveAt,
      expiresAt: result.session.expiresAt
    };

    if (isRoam) {
      const audit = createPasskeyAuditEvent(
        "session_restored_reload",
        "info",
        {
          credentialId: result.session.credentialId,
          deviceName: result.session.deviceName,
          ip: currentIp,
          details: { roamFrom: origIp, roamTo: currentIp, sessionId }
        }
      );
      appendPasskeyAuditRecord(audit, fs, this.dataDir);
    }

    this.saveSessionsToDisk();

    return {
      valid: true,
      session: result.session,
      roamContext
    };
  }

  public revokeSession(sessionId: string): boolean {
    const res = revokeAuthSession(sessionId, this.activeSessions);
    this.ipRoamHistory.delete(sessionId);
    this.saveSessionsToDisk();
    return res;
  }

  // --- PORTAL TOKENS (PAIRING ACROSS DEVICES & BROWSERS) ---

  public createPortalToken(
    type: "register" | "auth" = "register",
    fingerprint?: DeviceFingerprint
  ): { token: string; challenge: string; expiresAt: number } {
    const token = generatePortalToken(type, this.portalTokens, { fingerprint });
    const data = this.portalTokens.get(token);
    return {
      token,
      challenge: data?.challenge || "",
      expiresAt: data?.expiresAt || Date.now() + 15 * 60 * 1000
    };
  }

  public verifyPortalToken(
    token: string,
    success: boolean,
    metadata?: { deviceName?: string; fingerprint?: DeviceFingerprint }
  ): { success: boolean; error?: string } {
    return verifyPortalToken(token, success, this.portalTokens, this.expectedPassword, metadata);
  }

  public pollPortalToken(token: string): { authorized: boolean; password?: string; deviceName?: string; error?: string } {
    return pollAuthToken(token, this.portalTokens);
  }

  public syncClientPasskeys(clientList: PasskeyRecord[]): { merged: PasskeyRecord[]; addedCount: number; updatedCount: number } {
    const res = syncPasskeyCollections(this.passkeys, clientList);
    this.passkeys = res.merged;
    this.savePasskeysToDisk();
    return res;
  }

  public getAuditEvents(limit: number = 50): PasskeyAuditEvent[] {
    return readPasskeyAuditRecords(fs, this.dataDir, limit);
  }

  private getAuditEventsCount(): number {
    try {
      if (fs.existsSync(this.auditJournalFile)) {
        const raw = fs.readFileSync(this.auditJournalFile, "utf-8");
        return raw.split("\n").filter(Boolean).length;
      }
    } catch {}
    return 0;
  }
}
