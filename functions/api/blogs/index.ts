import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequestGet = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  const { request } = context;
  try {
    const url = new URL(request.url);
    const customBlogsUrl = new URL("/custom_blogs.json", url.origin);
    const res = await fetch(customBlogsUrl.toString());
    if (res.ok) {
      const data = await res.json();
      const blogs = Array.isArray(data) ? data : (data.blogs || []);
      return jsonResponse({ blogs, success: true });
    }
  } catch {}

  return jsonResponse({ blogs: [], success: true });
};

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  return jsonResponse({
    success: true,
    message: "Blog index updated",
    source: "cloudflare-backend",
  });
};

