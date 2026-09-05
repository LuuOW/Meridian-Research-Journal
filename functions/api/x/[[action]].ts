import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequest = async (context: {
  request: Request;
  env: CloudflareEnv;
  params: { action?: string[] };
}) => {
  const { env, params, request } = context;
  const action = (params.action || []).join("/");

  const oauth2Token = (
    env.X_OAUTH_ACCESS_TOKEN ||
    (env.X_ACCESS_TOKEN && env.X_ACCESS_TOKEN.length > 60 ? env.X_ACCESS_TOKEN : "") ||
    ""
  ).trim();

  const hasApiKey = Boolean(env.X_API_KEY || env.TWITTER_API_KEY);
  const hasSecret = Boolean(env.X_API_SECRET_KEY || env.TWITTER_API_SECRET_KEY);
  const hasToken = Boolean(env.X_ACCESS_TOKEN || env.TWITTER_ACCESS_TOKEN || env.X_OAUTH_ACCESS_TOKEN);
  const hasTokenSecret = Boolean(env.X_ACCESS_TOKEN_SECRET || env.TWITTER_ACCESS_TOKEN_SECRET);

  if (action === "status") {
    if (oauth2Token) {
      try {
        const meRes = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${oauth2Token}` },
        });
        if (meRes.ok) {
          const meData: any = await meRes.json();
          const accessLevel = (meRes.headers.get("x-access-level") || "").trim().toLowerCase();
          return jsonResponse({
            success: true,
            configured: true,
            connected: true,
            username: meData?.data?.username,
            name: meData?.data?.name,
            id: meData?.data?.id,
            httpStatus: meRes.status,
            authMethod: "OAuth 2.0 User Context",
            accessLevel: accessLevel || "read-write-directmessages",
            hasWritePermission: true,
            source: "cloudflare-backend",
          });
        }
      } catch (err: any) {
        console.warn("Error verifying OAuth 2.0 in Cloudflare Worker:", err);
      }
    }

    const isOauth1Configured = hasApiKey && hasSecret && hasToken && hasTokenSecret;
    return jsonResponse({
      success: true,
      configured: Boolean(oauth2Token || isOauth1Configured),
      connected: Boolean(oauth2Token || isOauth1Configured),
      authMethod: oauth2Token ? "OAuth 2.0 User Context" : "OAuth 1.0a User Context",
      missingKeys: oauth2Token || isOauth1Configured ? [] : ["X_OAUTH_ACCESS_TOKEN"],
      source: "cloudflare-backend",
    });
  }

  if (action === "test-post" || action === "publish-post") {
    if (oauth2Token) {
      try {
        let bodyJson: any = {};
        try {
          bodyJson = await request.json();
        } catch {}
        const text = bodyJson.customMessage || bodyJson.text || "Meridian Journal test post";
        const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${oauth2Token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });
        const tweetData: any = await tweetRes.json();
        if (tweetRes.ok && tweetData?.data?.id) {
          const tweetId = tweetData.data.id;
          return jsonResponse({
            success: true,
            mode: "live",
            tweetId,
            tweetUrl: `https://x.com/i/status/${tweetId}`,
            message: `Tweet published live to X! View status: https://x.com/i/status/${tweetId}`,
            source: "cloudflare-backend",
          });
        }
        return jsonResponse(
          {
            success: false,
            mode: "error",
            error: tweetData?.detail || "Failed to post tweet via OAuth 2.0",
            raw: tweetData,
            source: "cloudflare-backend",
          },
          tweetRes.status
        );
      } catch (err: any) {
        return jsonResponse({ success: false, error: err.message }, 500);
      }
    }
  }

  return jsonResponse({
    success: true,
    action,
    source: "cloudflare-backend",
  });
};
