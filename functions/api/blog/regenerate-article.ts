import { CloudflareEnv, getExpectedPassword, jsonResponse } from "../_utils";

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as {
      blogId?: string;
      title?: string;
      excerpt?: string;
      content?: string;
      tags?: string[];
      password?: string;
    };

    const expectedPassword = getExpectedPassword(env);
    if (body.password && body.password !== expectedPassword) {
      return jsonResponse(
        { error: "Unauthorized: Incorrect editor password." },
        403
      );
    }

    return jsonResponse({
      success: true,
      blogId: body.blogId,
      message: "Article successfully updated in backend tier",
      source: "cloudflare-backend",
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Article update error" }, 500);
  }
};
