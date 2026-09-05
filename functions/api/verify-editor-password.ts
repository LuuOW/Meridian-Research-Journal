import { CloudflareEnv, getExpectedPassword, isPasswordValid, jsonResponse } from "./_utils";

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const inputPassword = body?.password || "";

    if (inputPassword && isPasswordValid(inputPassword, env)) {
      return jsonResponse({
        success: true,
        valid: true,
        source: "cloudflare-backend",
        timestamp: new Date().toISOString(),
      });
    }

    return jsonResponse(
      {
        success: false,
        valid: false,
        error: "Incorrect editor password. Access denied.",
      },
      403
    );
  } catch (err: any) {
    return jsonResponse(
      {
        success: false,
        error: err?.message || "Internal verification error",
      },
      500
    );
  }
};

export const onRequestGet = async (context: {
  env: CloudflareEnv;
}) => {
  const { env } = context;
  const rawEditorPwd = env.EDITOR_PASSWORD ? String(env.EDITOR_PASSWORD) : "";
  const rawGenPwd = env.GENERATION_PASSWORD ? String(env.GENERATION_PASSWORD) : "";

  return jsonResponse({
    status: "ok",
    backend: "cloudflare-pages",
    editorAuthConfigured: Boolean(rawEditorPwd || rawGenPwd || env.ADMIN_PASSWORD || env.PASSWORD),
    diagnostics: {
      hasEditorPassword: Boolean(rawEditorPwd),
      editorPasswordLength: rawEditorPwd.length,
      editorPasswordHasQuotes: /^["'].*["']$/.test(rawEditorPwd.trim()),
      hasGenerationPassword: Boolean(rawGenPwd),
      generationPasswordLength: rawGenPwd.length,
      hasGeminiApiKey: Boolean(env.GEMINI_API_KEY),
      hasGithubToken: Boolean(env.GITHUB_TOKEN || env.GH_TOKEN),
      hasXApiKey: Boolean(env.X_API_KEY || env.TWITTER_API_KEY),
      hasBinanceApiKey: Boolean(env.BINANCE_API_KEY),
    },
    timestamp: new Date().toISOString(),
  });
};
