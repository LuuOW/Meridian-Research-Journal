import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequest = async (context: {
  request: Request;
  env: CloudflareEnv;
  params: { action?: string[] };
}) => {
  const { env, params } = context;
  const action = (params.action || []).join("/");

  if (action === "status") {
    return jsonResponse({
      configured: Boolean(env.BINANCE_API_KEY && env.BINANCE_SECRET_KEY),
      source: "cloudflare-backend",
    });
  }

  if (action === "donations") {
    return jsonResponse({
      addresses: {
        btc: "bc1q9u82r08z459r05yax5k5s2w5w402uxtk8v82z7",
        eth: "0x37C63740e53a00588a9134a4c669527f31131Eb3",
        sol: "7aW1vB2fP1cWzZ1eZ3mN7sY8bV5qL9xR4tK2jP6mD3sT",
      },
      source: "cloudflare-backend",
    });
  }

  return jsonResponse({
    success: true,
    action,
    source: "cloudflare-backend",
  });
};
