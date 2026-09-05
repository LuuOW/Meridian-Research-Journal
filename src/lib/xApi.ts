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
      httpStatus: 400,
      diagnosisTitle: "Empty Tweet Text",
      diagnosisDetail: "The tweet content was blank. Provide at least one character.",
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
      diagnosisTitle: "Simulation Mode (No Keys)",
      diagnosisDetail: "Configure X_API_KEY, X_API_SECRET_KEY, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET in Settings to enable direct posting.",
      troubleshootingSteps: [
        "1. Open Settings in AI Studio.",
        "2. Add X_API_KEY and X_API_SECRET_KEY (Consumer Keys).",
        "3. Add X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET (User Token with Read+Write permissions).",
      ],
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

    const httpStatus = response.status;

    if (!response.ok) {
      const errorText = await response.text();

      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(errorText);
      } catch {
        // Not JSON
      }

      // 1. Check for OAuth 1.0a permission issues (Read-only vs Read+Write)
      if (
        httpStatus === 403 &&
        (errorText.includes("oauth1-permissions") ||
          errorText.includes("appropriate oauth1 app permissions") ||
          errorText.includes("permissions"))
      ) {
        console.warn(
          `[X API Advisory] HTTP 403 (Read-Only OAuth1 Scope): App credentials have Read-only permissions. "Read and Write" scope + token regeneration required. Intent URL generated for manual sharing: ${intentUrl}`
        );
        return {
          success: false,
          mode: "error",
          httpStatus,
          error: parsedJson?.detail || `X API returned HTTP 403: Read-only OAuth permissions`,
          intentUrl,
          timestamp,
          rawResponse: parsedJson || errorText,
          errorCode: "OAUTH1_PERMISSIONS_READ_ONLY",
          diagnosisTitle: "X App Permissions: App is Read-Only (Need 'Read and Write' + Regenerated Token)",
          diagnosisDetail:
            "Your X Developer App currently has Read-only permissions, or your Access Token was created before changing the permission setting to 'Read and Write'.",
          troubleshootingSteps: [
            "1. Open https://developer.x.com and navigate to Projects & Apps -> Your App.",
            "2. Under 'User authentication settings', click 'Edit' (or 'Set up').",
            "3. Under 'App permissions', choose 'Read and Write' (or 'Read and write and Direct message').",
            "4. Under 'Type of App', select 'Web App, Automated App or Bot'. Save the settings.",
            "5. CRITICAL STEP: Go to the 'Keys and tokens' tab and click 'Regenerate' on 'Access Token and Secret'. (Old tokens retain previous Read-only permissions even after changing settings).",
            "6. Copy the new Access Token and Secret into AI Studio Settings under X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET.",
          ],
        };
      }

      console.error(`[X API Error] HTTP ${httpStatus}: ${errorText}`);

      // 2. Check for Duplicate Tweet
      if (httpStatus === 403 && (errorText.includes("duplicate") || errorText.includes("Status is a duplicate"))) {
        return {
          success: false,
          mode: "error",
          httpStatus,
          error: "X rejected this post because duplicate tweet text was already posted recently.",
          intentUrl,
          timestamp,
          rawResponse: parsedJson || errorText,
          errorCode: "DUPLICATE_TWEET",
          diagnosisTitle: "Duplicate Tweet Status",
          diagnosisDetail: "Twitter prevents identical consecutive tweets. Modify the text or append a timestamp.",
          troubleshootingSteps: [
            "Add a timestamp or unique hash to the tweet text.",
            "Click the 'X Test button' which automatically appends unique UTC seconds to bypass duplicate filters.",
          ],
        };
      }

      // 3. Check for Rate Limiting
      if (httpStatus === 429) {
        return {
          success: false,
          mode: "error",
          httpStatus,
          error: "X API rate limit reached (HTTP 429).",
          intentUrl,
          timestamp,
          rawResponse: parsedJson || errorText,
          errorCode: "RATE_LIMITED",
          diagnosisTitle: "X API Rate Limited",
          diagnosisDetail: "X endpoints enforce per-user and per-app request limits. Please wait ~15 minutes.",
        };
      }

      // 4. Check for Unauthorized / Invalid credentials
      if (httpStatus === 401) {
        return {
          success: false,
          mode: "error",
          httpStatus,
          error: parsedJson?.detail || "Invalid or expired OAuth 1.0a credentials (HTTP 401).",
          intentUrl,
          timestamp,
          rawResponse: parsedJson || errorText,
          errorCode: "UNAUTHORIZED",
          diagnosisTitle: "OAuth 1.0a Signature Verification Failed",
          diagnosisDetail: "One or more of your Consumer Keys (API Key/Secret) or User Tokens (Access Token/Secret) are incorrect.",
          troubleshootingSteps: [
            "Verify that X_API_KEY and X_API_SECRET_KEY match your Developer App.",
            "Verify that X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET match the same app and user account.",
          ],
        };
      }

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
    }

    const data: any = await response.json();
    const tweetId = data?.data?.id;
    const tweetUrl = tweetId ? `https://x.com/i/status/${tweetId}` : `https://x.com/ask_meridian`;

    console.log(`[X API Success] Tweet successfully published to X! ID: ${tweetId}`);

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
  } catch (err: any) {
    console.error("[X API Exception] Failed to post tweet:", err);
    return {
      success: false,
      mode: "error",
      error: err.message || "Failed to communicate with X API v2",
      intentUrl,
      timestamp,
      diagnosisTitle: "Network / Fetch Exception",
      diagnosisDetail: err.message || "Unknown communication failure with https://api.twitter.com/2/tweets",
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
      try {
        parsed = JSON.parse(errBody);
      } catch {}
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
    const writePermissionWarning = accessLevel === "read"
      ? "OAuth 1.0a access token has Read-only permissions (x-access-level: read). Direct tweet posting requires 'Read and Write' permission. In X Developer Portal, change App permissions to 'Read and Write', then Regenerate your Access Token & Secret in the Keys and Tokens tab."
      : undefined;

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
      writePermissionWarning,
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

  const testText =
    (customMessage && customMessage.trim()) ||
    `Meridian Journal [X Integration Test • ${artTime} ART #${uniqueStamp}] — Verifying OAuth 1.0a User Context for @${username}. Autonomous frontier physics & quantum optics: https://ask-meridian.uk #QuantumOptics #arXiv`;

  const result = await postTweetToX(testText);
  return {
    ...result,
    username,
    connection,
  };
}
