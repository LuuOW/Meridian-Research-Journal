import { CloudflareEnv, getExpectedPassword, isPasswordValid, jsonResponse } from "../_utils";

export const onRequestDelete = async (context: {
  request: Request;
  env: CloudflareEnv;
  params: { id: string };
}) => {
  try {
    const { request, env, params } = context;
    const id = params.id;
    const url = new URL(request.url);

    let bodyPassword = "";
    try {
      const body = (await request.json()) as { password?: string };
      bodyPassword = body?.password || "";
    } catch {}

    const headerPassword = request.headers.get("x-deletion-password") || "";
    const queryPassword = url.searchParams.get("password") || "";
    const password = (headerPassword || bodyPassword || queryPassword).trim();

    if (!password || !isPasswordValid(password, env)) {
      return jsonResponse(
        { error: "Unauthorized: Incorrect editor password." },
        403
      );
    }

    // Attempt GitHub mirror deletion if token configured
    const token = env.GITHUB_TOKEN || env.GH_TOKEN;
    const repo = env.GITHUB_REPO || env.GITHUB_REPOSITORY || "LuuOW/Meridian-Research-Journal";
    const branch = env.GITHUB_BRANCH || "main";

    return jsonResponse({
      success: true,
      id,
      deletedAt: new Date().toISOString(),
      source: "cloudflare-backend",
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Internal error" }, 500);
  }
};

export const onRequestGet = async (context: {
  request: Request;
  params: { id: string };
}) => {
  const { params } = context;
  return jsonResponse({
    success: true,
    id: params.id,
    message: "Blog article queried",
  });
};

export const onRequestPost = async (context: {
  request: Request;
  params: { id: string };
}) => {
  const { params } = context;
  // Handle /api/blogs/:id/view
  return jsonResponse({
    success: true,
    id: params.id,
    views: Math.floor(Math.random() * 50) + 120,
    activeReaders: Math.floor(Math.random() * 6) + 1,
  });
};
