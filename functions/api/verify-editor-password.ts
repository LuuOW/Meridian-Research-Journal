import { CloudflareEnv, getExpectedPassword, jsonResponse } from "./_utils";

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const inputPassword = body?.password?.trim() || "";

    const expectedPassword = getExpectedPassword(env);

    if (inputPassword && inputPassword === expectedPassword) {
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
  const hasSecret = Boolean(env.EDITOR_PASSWORD || env.GENERATION_PASSWORD);

  return jsonResponse({
    status: "ok",
    backend: "cloudflare-pages",
    editorAuthConfigured: hasSecret,
  });
};
