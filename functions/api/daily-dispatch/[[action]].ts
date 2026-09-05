import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequest = async (context: {
  request: Request;
  env: CloudflareEnv;
  params: { action?: string[] };
}) => {
  const { params } = context;
  const subAction = (params.action || []).join("/");

  if (subAction === "current" || subAction === "") {
    return jsonResponse({
      success: true,
      hasActiveDispatch: false,
      status: "idle",
      lastCrawl: new Date().toISOString(),
      candidates: [],
      source: "cloudflare-backend",
    });
  }

  return jsonResponse({
    success: true,
    action: subAction,
    message: "Action received",
    source: "cloudflare-backend",
  });
};
