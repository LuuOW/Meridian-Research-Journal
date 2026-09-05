import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequest = async (context: {
  request: Request;
  env: CloudflareEnv;
  params: { action?: string[] };
}) => {
  const { env, params } = context;
  const action = (params.action || []).join("/");

  const hasApiKey = Boolean(env.X_API_KEY || env.TWITTER_API_KEY);
  const hasSecret = Boolean(env.X_API_SECRET_KEY || env.TWITTER_API_SECRET_KEY);
  const hasToken = Boolean(env.X_ACCESS_TOKEN || env.TWITTER_ACCESS_TOKEN);
  const hasTokenSecret = Boolean(env.X_ACCESS_TOKEN_SECRET || env.TWITTER_ACCESS_TOKEN_SECRET);

  if (action === "status") {
    return jsonResponse({
      configured: hasApiKey && hasSecret && hasToken && hasTokenSecret,
      missingKeys: [
        ...(!hasApiKey ? ["X_API_KEY"] : []),
        ...(!hasSecret ? ["X_API_SECRET_KEY"] : []),
        ...(!hasToken ? ["X_ACCESS_TOKEN"] : []),
        ...(!hasTokenSecret ? ["X_ACCESS_TOKEN_SECRET"] : []),
      ],
      source: "cloudflare-backend",
    });
  }

  return jsonResponse({
    success: true,
    action,
    source: "cloudflare-backend",
  });
};
