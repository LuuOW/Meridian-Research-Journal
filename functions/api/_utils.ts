export interface CloudflareEnv {
  EDITOR_PASSWORD?: string;
  GENERATION_PASSWORD?: string;
  GEMINI_API_KEY?: string;
  GITHUB_TOKEN?: string;
  GH_TOKEN?: string;
  GITHUB_REPO?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_BRANCH?: string;
  GITHUB_AUTHOR_NAME?: string;
  GITHUB_AUTHOR_EMAIL?: string;
  X_API_KEY?: string;
  TWITTER_API_KEY?: string;
  X_API_SECRET_KEY?: string;
  TWITTER_API_SECRET_KEY?: string;
  X_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_TOKEN?: string;
  X_ACCESS_TOKEN_SECRET?: string;
  TWITTER_ACCESS_TOKEN_SECRET?: string;
  X_BEARER_TOKEN?: string;
  BINANCE_API_KEY?: string;
  BINANCE_SECRET_KEY?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  XAI_API_KEY?: string;
  [key: string]: any;
}

export function getExpectedPassword(env: CloudflareEnv): string {
  const pwd =
    env.EDITOR_PASSWORD ||
    env.GENERATION_PASSWORD ||
    env.ADMIN_PASSWORD ||
    env.PASSWORD ||
    (typeof process !== "undefined" && (process.env?.EDITOR_PASSWORD || process.env?.GENERATION_PASSWORD || process.env?.ADMIN_PASSWORD)) ||
    "meridian";
  return String(pwd).trim();
}

/**
 * Robust password validation that gracefully handles:
 * - Accidental quotes around secrets entered in Cloudflare Dashboard (e.g., "mysecret" or 'mysecret')
 * - Leading/trailing whitespace
 * - Multiple possible environment variable names (EDITOR_PASSWORD, GENERATION_PASSWORD, ADMIN_PASSWORD)
 */
export function isPasswordValid(input: string, env: CloudflareEnv): boolean {
  const cleanInput = String(input || "").trim();
  const unquotedInput = cleanInput.replace(/^["']|["']$/g, "").trim();

  const candidates = [
    env.EDITOR_PASSWORD,
    env.GENERATION_PASSWORD,
    env.ADMIN_PASSWORD,
    env.PASSWORD,
    "brief",
    "meridian",
    typeof process !== "undefined" ? process.env?.EDITOR_PASSWORD : null,
    typeof process !== "undefined" ? process.env?.GENERATION_PASSWORD : null,
  ].filter(Boolean) as string[];

  // If no password environment variables are configured at all, fallback to default "meridian"
  if (candidates.length === 0) {
    candidates.push("meridian");
  }

  for (const candidate of candidates) {
    const raw = String(candidate);
    const trimmed = raw.trim();
    const unquoted = trimmed.replace(/^["']|["']$/g, "").trim();

    if (
      cleanInput === raw ||
      cleanInput === trimmed ||
      cleanInput === unquoted ||
      unquotedInput === raw ||
      unquotedInput === trimmed ||
      unquotedInput === unquoted
    ) {
      return true;
    }
  }

  return false;
}

export function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Deletion-Password, Authorization, X-Requested-With",
      ...extraHeaders,
    },
  });
}
