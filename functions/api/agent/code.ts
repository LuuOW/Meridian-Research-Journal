import { CloudflareEnv, jsonResponse, isPasswordValid } from "../_utils";
import { XaiCodingAgent, CodingAgentRequest } from "../../../src/services/XaiCodingAgent";

// Add XAI_API_KEY to the env interface (also update _utils.ts)
declare module "../_utils" {
  interface CloudflareEnv {
    XAI_API_KEY?: string;
  }
}

const agent = new XaiCodingAgent();

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  const { request, env } = context;

  try {
    // Optional: gate behind editor password for production safety
    const password =
      request.headers.get("X-Deletion-Password") ||
      request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
      "";
    // Allow if password matches OR if no password configured (dev)
    if (password && !isPasswordValid(password, env)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await request.json()) as CodingAgentRequest;

    if (!body.instruction && !body.code) {
      return jsonResponse(
        { error: "Provide at least 'instruction' or 'code'" },
        400
      );
    }

    const result = await agent.run(
      {
        task: body.task || "generate",
        language: body.language || "typescript",
        code: body.code,
        instruction: body.instruction || "Review and improve this code",
        context: body.context,
        model: body.model,
      },
      env
    );

    return jsonResponse(result, result.success ? 200 : 502);
  } catch (err: any) {
    return jsonResponse(
      { success: false, error: err?.message || "Agent failed" },
      500
    );
  }
};

export const onRequestGet = async () => {
  return jsonResponse({
    service: "XaiCodingAgent",
    endpoints: {
      "POST /api/agent/code": {
        body: {
          task: "generate | review | fix | explain | refactor | test",
          language: "typescript (default)",
          code: "optional source",
          instruction: "required if no code",
          context: "optional extra context",
          model: "optional (default grok-4.6)",
        },
      },
    },
  });
};
