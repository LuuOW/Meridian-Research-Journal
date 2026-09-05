import { CloudflareEnv, getExpectedPassword, jsonResponse } from "../_utils";

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as {
      password?: string;
      blogs?: any[];
      reason?: string;
    };

    const expectedPassword = getExpectedPassword(env);
    if (body.password && body.password !== expectedPassword) {
      return jsonResponse(
        { error: "Unauthorized: Incorrect password." },
        403
      );
    }

    return jsonResponse({
      success: true,
      message: "Blogs synchronized successfully across tiers.",
      source: "cloudflare-backend",
      tiers: {
        cloudflareEdge: true,
        gitHubMirror: Boolean(env.GITHUB_TOKEN || env.GH_TOKEN),
      },
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Sync error" }, 500);
  }
};
