import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request } = context;
    const body = (await request.json().catch(() => ({}))) as {
      blogId?: string;
      title?: string;
      tags?: string[];
      seed?: number;
    };

    const title = body?.title || "Research Investigation";
    const seed = body?.seed || Date.now();
    const colors = [
      ["#38bdf8", "#818cf8"],
      ["#34d399", "#059669"],
      ["#f43f5e", "#fb7185"],
      ["#a855f7", "#6366f1"],
    ];
    const pair = colors[seed % colors.length];

    const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" class="w-full h-full rounded-2xl overflow-hidden shadow-xl">
  <defs>
    <linearGradient id="g-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g-${seed})"/>
  <circle cx="400" cy="200" r="140" stroke="${pair[0]}" stroke-width="2" fill="none" opacity="0.4"/>
  <circle cx="400" cy="200" r="90" stroke="${pair[1]}" stroke-width="1.5" stroke-dasharray="6,6" fill="none" opacity="0.7"/>
  <text x="400" y="205" fill="#f8fafc" font-size="20" font-weight="700" text-anchor="middle" font-family="sans-serif">${title.slice(0, 38)}</text>
</svg>`;

    return jsonResponse({
      success: true,
      bannerSvg,
      source: "cloudflare-backend",
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Banner error" }, 500);
  }
};
