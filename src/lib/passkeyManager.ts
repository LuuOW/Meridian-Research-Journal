export interface PortalTokenData {
  type: "register" | "auth";
  createdAt: number;
  authorized?: boolean;
  password?: string;
  deviceName?: string;
}

export interface PasskeyCredentialInput {
  id?: string;
  type?: string;
  publicKey?: string;
  deviceName?: string;
}

export interface PasskeyRecord {
  id: string;
  publicKey?: string;
  deviceName: string;
  createdAt: number;
  lastUsedAt?: number;
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
  portalTokens: Map<string, PortalTokenData>
): string {
  const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  portalTokens.set(token, {
    type: type || "register",
    createdAt: Date.now(),
    authorized: false
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
    if (now - data.createdAt > maxAgeMs) {
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
  editorPassword?: string
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
): { authorized: boolean; password?: string; error?: string } {
  if (!token) {
    return { authorized: false, error: "Token is required" };
  }

  const tokenData = portalTokens.get(token);
  if (!tokenData) {
    return { authorized: false, error: "Token not found or expired" };
  }

  if (tokenData.authorized) {
    const password = tokenData.password || "meridian";
    // Consume token on successful poll to prevent replay attacks
    portalTokens.delete(token);
    return { authorized: true, password };
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
 * Registers a new passkey or updates an existing one in a passkey collection
 */
export function registerNewPasskey(
  existingPasskeys: PasskeyRecord[],
  newCredential: { id: string; deviceName?: string; publicKey?: string },
  currentTime?: number
): { updatedPasskeys: PasskeyRecord[]; added: boolean } {
  const cleanId = sanitizeCredentialId(newCredential.id);
  if (!cleanId) {
    return { updatedPasskeys: existingPasskeys, added: false };
  }

  const now = currentTime !== undefined ? currentTime : Date.now();
  const index = existingPasskeys.findIndex(p => p.id === cleanId);

  if (index >= 0) {
    // Update existing record
    const updated = [...existingPasskeys];
    updated[index] = {
      ...updated[index],
      deviceName: newCredential.deviceName?.trim() || updated[index].deviceName,
      publicKey: newCredential.publicKey || updated[index].publicKey,
      lastUsedAt: now
    };
    return { updatedPasskeys: updated, added: false };
  }

  // Insert new record
  const newRecord: PasskeyRecord = {
    id: cleanId,
    deviceName: formatPasskeyLabel(newCredential.deviceName, cleanId),
    publicKey: newCredential.publicKey || "",
    createdAt: now,
    lastUsedAt: now
  };

  return {
    updatedPasskeys: [newRecord, ...existingPasskeys],
    added: true
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
      return { ...p, lastUsedAt: now };
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
): { authorized: boolean; error?: string; password?: string; updatedPasskeys?: PasskeyRecord[]; matched?: PasskeyRecord } {
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
  const updatedMatched = { ...matched, lastUsedAt: now };

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
export function prunePasskeys(passkeys: PasskeyRecord[], maxCount: number = 20): PasskeyRecord[] {
  if (passkeys.length <= maxCount) return passkeys;
  return [...passkeys]
    .sort((a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt))
    .slice(0, maxCount);
}
