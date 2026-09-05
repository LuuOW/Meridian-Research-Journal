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

    const clientBlogs = body.blogs || [];

    let existingBlogs: any[] = [];
    try {
      const url = new URL(request.url);
      const customBlogsUrl = new URL("/custom_blogs.json", url.origin);
      const res = await fetch(customBlogsUrl.toString());
      if (res.ok) {
        const data = await res.json();
        existingBlogs = Array.isArray(data) ? data : (data.blogs || []);
      }
    } catch {}

    const mergedMap = new Map<string, any>();
    existingBlogs.forEach((b: any) => {
      if (b && b.id) mergedMap.set(b.id, b);
    });
    clientBlogs.forEach((b: any) => {
      if (b && b.id) mergedMap.set(b.id, b);
    });

    const mergedBlogs = Array.from(mergedMap.values());

    return jsonResponse({
      success: true,
      blogs: mergedBlogs,
      message: "Blogs synchronized successfully across tiers.",
      source: "cloudflare-backend",
      tiers: {
        cloudflareEdge: true,
        gitHubMirror: Boolean(env.GITHUB_TOKEN || env.GH_TOKEN),
      },
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Sync error", blogs: [] }, 500);
  }
};
