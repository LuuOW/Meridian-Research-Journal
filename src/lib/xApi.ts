/**
 * MERIDIAN X (TWITTER) API v2 INTEGRATION ENGINE
 * 
 * Provides authenticated OAuth 1.0a User Context posting to Twitter/X API v2,
 * enabling autonomous, scheduled publication of companion posts to @ask_meridian.
 * 
 * Compliant with X API v2 POST /2/tweets endpoint.
 */

import crypto from "crypto";

export interface XApiCredentials {
  apiKey: string;
  apiSecretKey: string;
  accessToken: string;
  accessTokenSecret: string;
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
}

export interface XConnectionStatus {
  configured: boolean;
  connected: boolean;
  username?: string;
  name?: string;
  id?: string;
  missingKeys: string[];
  error?: string;
}

/**
 * RFC 3986 percent encoding for OAuth 1.0a
 */
export function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
    return `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

/**
 * Gets active X API credentials from process.env
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

  // 5. Construct Authorization Header (excluding query params)
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
    };
  }

  const credentials = getXCredentials();

  // If credentials are not configured in environment, provide clean simulation response
  if (!credentials) {
    console.log("[X API] Credentials not configured in environment. Using simulation mode for X post.");
    return {
      success: true,
      mode: "unconfigured_simulation",
      tweetId: `sim_${timestamp}`,
      tweetUrl: `https://x.com/ask_meridian/status/sim_${timestamp}`,
      text: cleanText,
      intentUrl,
      message: "X API credentials (X_API_KEY, X_ACCESS_TOKEN, etc.) not detected in AI Studio Secrets. Tweet saved and intent URL ready for manual sharing.",
      timestamp,
    };
  }

  const endpoint = "https://api.twitter.com/2/tweets";
  try {
    const authHeader = generateOAuth1Header("POST", endpoint, credentials);

    console.log(`[X API] Dispatching tweet to X API v2 (${cleanText.length} chars)...`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: cleanText }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[X API Error] HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        mode: "error",
        error: `X API returned HTTP ${response.status}: ${errorText}`,
        intentUrl,
        timestamp,
      };
    }

    const data: any = await response.json();
    const tweetId = data?.data?.id;
    const tweetUrl = tweetId ? `https://x.com/i/status/${tweetId}` : `https://x.com/ask_meridian`;

    console.log(`[X API Success] Tweet successfully published to X! ID: ${tweetId}`);

    return {
      success: true,
      mode: "live",
      tweetId,
      tweetUrl,
      text: cleanText,
      intentUrl,
      message: `Tweet published live to X! View status: ${tweetUrl}`,
      timestamp,
    };
  } catch (err: any) {
    console.error("[X API Exception] Failed to post tweet:", err);
    return {
      success: false,
      mode: "error",
      error: err.message || "Failed to communicate with X API v2",
      intentUrl,
      timestamp,
    };
  }
}

/**
 * Tests connection to X API v2 using current credentials
 */
export async function testXConnection(): Promise<XConnectionStatus> {
  const missingKeys: string[] = [];
  if (!process.env.X_API_KEY && !process.env.TWITTER_API_KEY) missingKeys.push("X_API_KEY");
  if (!process.env.X_API_SECRET_KEY && !process.env.TWITTER_API_SECRET_KEY) missingKeys.push("X_API_SECRET_KEY");
  if (!process.env.X_ACCESS_TOKEN && !process.env.TWITTER_ACCESS_TOKEN) missingKeys.push("X_ACCESS_TOKEN");
  if (!process.env.X_ACCESS_TOKEN_SECRET && !process.env.TWITTER_ACCESS_TOKEN_SECRET) missingKeys.push("X_ACCESS_TOKEN_SECRET");

  if (missingKeys.length > 0) {
    return {
      configured: false,
      connected: false,
      missingKeys,
      error: `Missing credentials in environment: ${missingKeys.join(", ")}`,
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

    if (!res.ok) {
      const errBody = await res.text();
      return {
        configured: true,
        connected: false,
        missingKeys: [],
        error: `X API verification failed (HTTP ${res.status}): ${errBody}`,
      };
    }

    const data: any = await res.json();
    return {
      configured: true,
      connected: true,
      username: data?.data?.username,
      name: data?.data?.name,
      id: data?.data?.id,
      missingKeys: [],
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      missingKeys: [],
      error: err.message || "Network error testing X API connection",
    };
  }
}
