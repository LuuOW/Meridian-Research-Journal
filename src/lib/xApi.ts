/**
 * MERIDIAN X (TWITTER) API v2 INTEGRATION ENGINE
 * 
 * Supports both:
 * 1. OAuth 2.0 User Context (Modern PKCE / User Access Token with Refresh Tokens)
 * 2. OAuth 1.0a User Context (RFC 5849 HMAC-SHA1 cryptographic signing)
 * 
 * Compliant with X API v2 POST /2/tweets and GET /2/users/me endpoints.
 */

import crypto from "crypto";

export interface XApiCredentials {
  apiKey: string;
  apiSecretKey: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface XOAuth2Tokens {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
}

export interface XTweetResult {
  success: boolean;
  mode: "live" | "unconfigured_simulation" | "error";
  tweetId?: string;
  tweetUrl?: string;
  text?: string;
  intentUrl?: string;
  message?: string;
  error?: string;
  timestamp: number;
  httpStatus?: number;
  username?: string;
  errorCode?: string;
  diagnosisTitle?: string;
  diagnosisDetail?: string;
  troubleshootingSteps?: string[];
  rawResponse?: any;
}

export interface XConnectionStatus {
  configured: boolean;
  connected: boolean;
  username?: string;
  name?: string;
  id?: string;
  missingKeys: string[];
  error?: string;
  httpStatus?: number;
  authMethod?: "OAuth 1.0a User Context" | "OAuth 2.0 User Context";
  rawResponse?: any;
  accessLevel?: string;
  hasWritePermission?: boolean;
  writePermissionWarning?: string;
  keyPreviews?: {
    apiKey?: string;
    accessToken?: string;
    hasSecret?: boolean;
    hasTokenSecret?: boolean;
    hasBearer?: boolean;
  };
}

let inMemoryOAuth2Token: string | null = null;
let inMemoryRefreshToken: string | null = null;

/**
 * RFC 3986 percent encoding for OAuth 1.0a
 */
export function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
    return `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

/**
 * Gets OAuth 2.0 User Context tokens if configured
 */
export function getOAuth2Tokens(): XOAuth2Tokens | null {
  const token = (
    inMemoryOAuth2Token ||
    process.env.X_OAUTH_ACCESS_TOKEN ||
    (process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_TOKEN.length > 60 ? process.env.X_ACCESS_TOKEN : "") ||
    ""
  ).trim();

  if (!token) return null;

  const refreshToken = (
    inMemoryRefreshToken ||
    process.env.X_OAUTH_REFRESH_TOKEN ||
    ""
  ).trim();

  const clientId = (
    process.env.X_OAUTH_2_0_CLIENT_ID ||
    process.env.X_CLIENT_ID ||
    ""
  ).trim();

  return {
    accessToken: token,
    refreshToken: refreshToken || undefined,
    clientId: clientId || undefined,
  };
}

/**
 * Automatically refresh OAuth 2.0 User Access Token if expired
 */
export async function refreshOAuth2AccessToken(): Promise<string | null> {
  const tokens = getOAuth2Tokens();
  if (!tokens?.refreshToken || !tokens?.clientId) return null;

  try {
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        client_id: tokens.clientId,
      }).toString(),
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data.access_token) {
        inMemoryOAuth2Token = data.access_token;
        if (data.refresh_token) {
          inMemoryRefreshToken = data.refresh_token;
        }
        console.log("[OAuth 2.0 Refresh] Successfully refreshed X access token!");
        return data.access_token;
      }
    } else {
      const errText = await res.text();
      console.warn("[OAuth 2.0 Refresh] Token refresh endpoint returned error:", errText);
    }
  } catch (err) {
    console.warn("[OAuth 2.0 Refresh] Exception during token refresh:", err);
  }
  return null;
}

/**
 * Gets active OAuth 1.0a credentials from process.env
 */
export function getXCredentials(): XApiCredentials | null {
  const apiKey = (process.env.X_API_KEY || process.env.TWITTER_API_KEY || "").trim();
  const apiSecretKey = (process.env.X_API_SECRET_KEY || process.env.TWITTER_API_SECRET_KEY || "").trim();
  const accessToken = (process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN || "").trim();
  const accessTokenSecret = (process.env.X_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_TOKEN_SECRET || "").trim();

  if (!apiKey || !apiSecretKey || !accessToken || !accessTokenSecret) {
    return null;
  }

  return { apiKey, apiSecretKey, accessToken, accessTokenSecret };
}

/**
 * Generates an OAuth 1.0a Authorization Header for X API requests (RFC 5849)
 */
export function generateOAuth1Header(
  method: string,
  url: string,
  credentials: XApiCredentials,
  queryParams: Record<string, string> = {}
): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
    ...queryParams,
  };

  // 1. Sort parameter keys alphabetically
  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  // 2. Build Signature Base String
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;

  // 3. Build Signing Key
  const signingKey = `${percentEncode(credentials.apiSecretKey)}&${percentEncode(credentials.accessTokenSecret)}`;

  // 4. Calculate HMAC-SHA1
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams.oauth_signature = signature;

  // 5. Construct Authorization Header
  const headerKeys = [
    "oauth_consumer_key",
    "oauth_nonce",
    "oauth_signature",
    "oauth_signature_method",
    "oauth_timestamp",
    "oauth_token",
    "oauth_version",
  ].sort();

  const headerParts = headerKeys.map(
    (k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`
  );

  return `OAuth ${headerParts.join(", ")}`;
}

/**
 * Posts a tweet directly to X via v2 /2/tweets endpoint
 */
export async function postTweetToX(text: string): Promise<XTweetResult> {
  const timestamp = Date.now();
  const cleanText = (text || "").trim();
  const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(cleanText)}`;

  if (!cleanText) {
    return {
      success: false,
      mode: "error",
      error: "Cannot post empty tweet text",
      intentUrl,
      timestamp,
      httpStatus: 400,
      diagnosisTitle: "Empty Tweet Text",
      diagnosisDetail: "The tweet content was blank. Provide at least one character.",
    };
  }

  // 1. Check for OAuth 2.0 User Context first
  const oauth2 = getOAuth2Tokens();
  if (oauth2) {
    const endpoint = "https://api.twitter.com/2/tweets";
    try {
      let currentToken = oauth2.accessToken;
      let response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleanText }),
      });

      // If token expired (HTTP 401) and we have a refresh token, auto-refresh and retry
      if (response.status === 401 && oauth2.refreshToken && oauth2.clientId) {
        const refreshedToken = await refreshOAuth2AccessToken();
        if (refreshedToken) {
          currentToken = refreshedToken;
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: cleanText }),
          });
        }
      }

      const httpStatus = response.status;
      if (response.ok) {
        const data: any = await response.json();
        const tweetId = data?.data?.id;
        const tweetUrl = tweetId ? `https://x.com/i/status/${tweetId}` : `https://x.com/ask_meridian`;
        console.log(`[X API Success] Tweet successfully published via OAuth 2.0 User Context! ID: ${tweetId}`);

        return {
          success: true,
          mode: "live",
          httpStatus,
          tweetId,
          tweetUrl,
          text: cleanText,
          intentUrl,
          message: `Tweet published live to X! View status: ${tweetUrl}`,
          timestamp,
          rawResponse: data,
          diagnosisTitle: "Tweet Published Successfully",
          diagnosisDetail: `Live post confirmed with Twitter API v2. Tweet ID: ${tweetId}`,
        };
      }

      const errorText = await response.text();
      let parsedJson: any = null;
      try { parsedJson = JSON.parse(errorText); } catch {}

      return {
        success: false,
        mode: "error",
        httpStatus,
        error: parsedJson?.detail || parsedJson?.title || `X API returned HTTP ${httpStatus}: ${errorText}`,
        intentUrl,
        timestamp,
        rawResponse: parsedJson || errorText,
        diagnosisTitle: `X API HTTP ${httpStatus} Error`,
        diagnosisDetail: errorText,
      };
    } catch (err: any) {
      console.error("[X API OAuth 2.0 Exception]", err);
    }
  }

  // 2. Fallback to OAuth 1.0a User Context
  const credentials = getXCredentials();
  if (!credentials) {
    console.log("[X API] Neither OAuth 2.0 nor complete OAuth 1.0a configured. Simulation mode.");
    return {
      success: true,
      mode: "unconfigured_simulation",
      tweetId: `sim_${timestamp}`,
      tweetUrl: `https://x.com/ask_meridian/status/sim_${timestamp}`,
      text: cleanText,
      intentUrl,
      message: "X API credentials not detected. Tweet saved and Web Intent ready.",
      timestamp,
      diagnosisTitle: "Simulation Mode (No Keys)",
      diagnosisDetail: "Configure X_OAUTH_ACCESS_TOKEN (OAuth 2.0) or OAuth 1.0a keys in Settings to enable direct posting.",
    };
  }

  const endpoint = "https://api.twitter.com/2/tweets";
  try {
    const authHeader = generateOAuth1Header("POST", endpoint, credentials);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: cleanText }),
    });

    const httpStatus = response.status;
    if (response.ok) {
      const data: any = await response.json();
      const tweetId = data?.data?.id;
      const tweetUrl = tweetId ? `https://x.com/i/status/${tweetId}` : `https://x.com/ask_meridian`;
      return {
        success: true,
        mode: "live",
        httpStatus,
        tweetId,
        tweetUrl,
        text: cleanText,
        intentUrl,
        message: `Tweet published live to X! View status: ${tweetUrl}`,
        timestamp,
        rawResponse: data,
        diagnosisTitle: "Tweet Published Successfully",
        diagnosisDetail: `Live post confirmed with Twitter API v2. Tweet ID: ${tweetId}`,
      };
    }

    const errorText = await response.text();
    let parsedJson: any = null;
    try { parsedJson = JSON.parse(errorText); } catch {}

    return {
      success: false,
      mode: "error",
      httpStatus,
      error: parsedJson?.detail || `X API returned HTTP ${httpStatus}: ${errorText}`,
      intentUrl,
      timestamp,
      rawResponse: parsedJson || errorText,
      diagnosisTitle: `X API HTTP ${httpStatus} Error`,
      diagnosisDetail: errorText,
    };
  } catch (err: any) {
    return {
      success: false,
      mode: "error",
      error: err.message || "Failed to communicate with X API v2",
      intentUrl,
      timestamp,
      diagnosisTitle: "Network / Fetch Exception",
      diagnosisDetail: err.message || "Unknown communication failure",
    };
  }
}

/**
 * Tests connection to X API v2 using current credentials
 */
export async function testXConnection(): Promise<XConnectionStatus> {
  const oauth2 = getOAuth2Tokens();

  // 1. Prefer OAuth 2.0 User Context if configured
  if (oauth2) {
    const endpoint = "https://api.twitter.com/2/users/me";
    try {
      let currentToken = oauth2.accessToken;
      let res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (res.status === 401 && oauth2.refreshToken && oauth2.clientId) {
        const refreshedToken = await refreshOAuth2AccessToken();
        if (refreshedToken) {
          currentToken = refreshedToken;
          res = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          });
        }
      }

      if (res.ok) {
        const data: any = await res.json();
        const accessLevel = (res.headers.get("x-access-level") || "").trim().toLowerCase();
        const hasWritePermission = !accessLevel || accessLevel.includes("write");

        return {
          configured: true,
          connected: true,
          username: data?.data?.username,
          name: data?.data?.name,
          id: data?.data?.id,
          missingKeys: [],
          httpStatus: res.status,
          authMethod: "OAuth 2.0 User Context",
          accessLevel: accessLevel || "read-write",
          hasWritePermission,
          rawResponse: data,
          keyPreviews: {
            accessToken: `${currentToken.slice(0, 8)}...${currentToken.slice(-4)}`,
            hasSecret: !!oauth2.refreshToken,
            hasBearer: true,
          },
        };
      } else {
        const errBody = await res.text();
        let parsed: any = null;
        try { parsed = JSON.parse(errBody); } catch {}
        return {
          configured: true,
          connected: false,
          missingKeys: [],
          httpStatus: res.status,
          error: parsed?.detail || `OAuth 2.0 verification failed (HTTP ${res.status}): ${errBody}`,
          authMethod: "OAuth 2.0 User Context",
          rawResponse: parsed || errBody,
        };
      }
    } catch (err: any) {
      console.warn("[OAuth 2.0 Test Exception]", err);
    }
  }

  // 2. Fallback to OAuth 1.0a
  const missingKeys: string[] = [];
  if (!process.env.X_API_KEY && !process.env.TWITTER_API_KEY) missingKeys.push("X_API_KEY");
  if (!process.env.X_API_SECRET_KEY && !process.env.TWITTER_API_SECRET_KEY) missingKeys.push("X_API_SECRET_KEY");
  if (!process.env.X_ACCESS_TOKEN && !process.env.TWITTER_ACCESS_TOKEN) missingKeys.push("X_ACCESS_TOKEN");
  if (!process.env.X_ACCESS_TOKEN_SECRET && !process.env.TWITTER_ACCESS_TOKEN_SECRET) missingKeys.push("X_ACCESS_TOKEN_SECRET");

  const apiKeyVal = process.env.X_API_KEY || process.env.TWITTER_API_KEY || "";
  const accessTokenVal = process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN || "";

  const keyPreviews = {
    apiKey: apiKeyVal ? `${apiKeyVal.slice(0, 4)}...${apiKeyVal.slice(-3)}` : undefined,
    accessToken: accessTokenVal ? `${accessTokenVal.slice(0, 10)}...` : undefined,
    hasSecret: !!(process.env.X_API_SECRET_KEY || process.env.TWITTER_API_SECRET_KEY),
    hasTokenSecret: !!(process.env.X_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_TOKEN_SECRET),
    hasBearer: !!process.env.X_BEARER_TOKEN,
  };

  if (missingKeys.length > 0) {
    return {
      configured: false,
      connected: false,
      missingKeys,
      error: `Missing credentials in environment: ${missingKeys.join(", ")}`,
      authMethod: "OAuth 1.0a User Context",
      keyPreviews,
    };
  }

  const credentials = getXCredentials()!;
  const endpoint = "https://api.twitter.com/2/users/me";

  try {
    const authHeader = generateOAuth1Header("GET", endpoint, credentials);
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    const httpStatus = res.status;
    if (!res.ok) {
      const errBody = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(errBody); } catch {}
      return {
        configured: true,
        connected: false,
        missingKeys: [],
        httpStatus,
        error: parsed?.detail || `X API verification failed (HTTP ${httpStatus}): ${errBody}`,
        authMethod: "OAuth 1.0a User Context",
        rawResponse: parsed || errBody,
        keyPreviews,
      };
    }

    const data: any = await res.json();
    const accessLevel = (res.headers.get("x-access-level") || "").trim().toLowerCase();
    const hasWritePermission = accessLevel.includes("write");

    return {
      configured: true,
      connected: true,
      username: data?.data?.username,
      name: data?.data?.name,
      id: data?.data?.id,
      missingKeys: [],
      httpStatus,
      authMethod: "OAuth 1.0a User Context",
      accessLevel: accessLevel || undefined,
      hasWritePermission: accessLevel ? hasWritePermission : undefined,
      rawResponse: data,
      keyPreviews,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      missingKeys: [],
      error: err.message || "Network error testing X API connection",
      authMethod: "OAuth 1.0a User Context",
      keyPreviews,
    };
  }
}

/**
 * High-level helper to execute an authentic test tweet to verify X integration
 */
export async function executeTestTweet(customMessage?: string): Promise<XTweetResult & { connection: XConnectionStatus }> {
  const connection = await testXConnection();
  const username = connection.username || "lk3mpe";

  const artTime = new Date().toLocaleTimeString("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const uniqueStamp = Date.now().toString().slice(-4);
  const authLabel = connection.authMethod || "OAuth 2.0 User Context";

  const testText =
    (customMessage && customMessage.trim()) ||
    `Meridian Journal [Pipeline Verification • ${artTime} ART #${uniqueStamp}] — ${authLabel} live test for @${username}. Autonomous frontier physics & quantum optics: https://ask-meridian.uk #QuantumOptics #arXiv`;

  const result = await postTweetToX(testText);
  return {
    ...result,
    username,
    connection,
  };
}
