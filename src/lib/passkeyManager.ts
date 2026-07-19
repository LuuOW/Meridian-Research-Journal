export interface PortalTokenData {
  type: "register" | "auth";
  createdAt: number;
  authorized?: boolean;
  password?: string;
}

export interface PasskeyCredentialInput {
  id?: string;
  type?: string;
  publicKey?: string;
}

/**
 * Validates the structure and presence of a passkey credential object
 */
export function validatePasskeyCredential(credential: PasskeyCredentialInput | null | undefined): boolean {
  if (!credential) return false;
  if (!credential.id || typeof credential.id !== "string" || credential.id.trim() === "") return false;
  return true;
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
    // Consume token on successful poll
    portalTokens.delete(token);
    return { authorized: true, password };
  }

  return { authorized: false };
}
