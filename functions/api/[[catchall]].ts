import { CloudflareEnv, jsonResponse } from "./_utils";

export const onRequest = async (context: {
  request: Request;
  env: CloudflareEnv;
  params: { catchall?: string[] };
}) => {
  const { request, params } = context;
  const path = (params.catchall || []).join("/");

  return jsonResponse({
    status: "ok",
    backend: "cloudflare-pages",
    path: `/api/${path}`,
    method: request.method,
    timestamp: new Date().toISOString(),
  });
};
