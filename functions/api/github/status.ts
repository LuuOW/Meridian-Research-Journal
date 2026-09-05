import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequestGet = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  const { env } = context;
  const token = env.GITHUB_TOKEN || env.GH_TOKEN || (typeof process !== "undefined" ? process.env?.GITHUB_TOKEN || process.env?.GH_TOKEN : "") || "";
  const repo = env.GITHUB_REPO || env.GITHUB_REPOSITORY || "LuuOW/Meridian-Research-Journal";
  const branch = env.GITHUB_BRANCH || "main";
  const authorName = env.GITHUB_AUTHOR_NAME || "Meridian Research";
  const authorEmail = env.GITHUB_AUTHOR_EMAIL || "bot@ask-meridian.uk";

  let connected = false;
  let user: any = null;

  if (token) {
    try {
      const resp = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "meridian-research-journal",
          Accept: "application/vnd.github+json",
        },
      });
      if (resp.ok) {
        user = await resp.json();
        connected = true;
      }
    } catch {}
  }

  return jsonResponse({
    configured: Boolean(token),
    connected,
    repo,
    branch,
    authorName,
    authorEmail,
    user,
    source: "cloudflare-backend",
  });
};
