/**
 * XaiCodingAgent – SpaceXAI / Grok coding agent microservice.
 * Uses XAI_API_KEY (Cloudflare secret) for code generation, review, and repair.
 */

import { xaiChatCompletion, getXaiApiKey } from "../lib/xaiClient";

type CodingTask =
  | "generate"
  | "review"
  | "fix"
  | "explain"
  | "refactor"
  | "test";

export interface CodingAgentRequest {
  task: CodingTask;
  language?: string;
  code?: string;
  instruction: string;
  context?: string; // extra files / repo context
  model?: string;
}

export interface CodingAgentResponse {
  success: boolean;
  task: CodingTask;
  result: string;
  model: string;
  usage?: any;
  error?: string;
}

const SYSTEM_PROMPTS: Record<CodingTask, string> = {
  generate: `You are Grok, a senior software engineer and coding agent built by xAI (SpaceXAI).\nWrite clean, production-ready code. Prefer TypeScript/React/Node patterns used in modern Vite + Clo[...]

  review: `You are Grok, a strict senior code reviewer. Identify bugs, security issues, race conditions, performance problems, and style issues.\nBe concise and actionable. Structure the review as[...]

  fix: `You are Grok, a coding agent that repairs broken code. Given the code and a description of the bug or error, return the corrected version.\nExplain the root cause in 1-2 sentences, then pr[...]

  explain: `You are Grok, a clear technical teacher. Explain the provided code step-by-step for a competent engineer.\nHighlight invariants, edge cases, and any non-obvious design decisions.`,

  refactor: `You are Grok, a refactoring specialist. Improve readability, structure, and maintainability without changing external behaviour.\nReturn the refactored code and a short bullet list of[...]

  test: `You are Grok, a test engineer. Write thorough unit/integration tests (prefer Node test runner or Vitest style) for the given code.\nCover happy path, edge cases, and failure modes. Return[...]
};

export class XaiCodingAgent {
  public readonly serviceName = "XaiCodingAgent";
  public readonly version = "1.0.0";

  private startTime = Date.now();
  private lastHeartbeat = Date.now();
  private lastResult: CodingAgentResponse | null = null;

  public async initialize(): Promise<boolean> {
    this.lastHeartbeat = Date.now();
    console.log(`[${this.serviceName}] Initialized (SpaceXAI coding agent)`);
    return true;
  }

  public async shutdown(): Promise<boolean> {
    return true;
  }

  public async getHealth(): Promise<any> {
    this.lastHeartbeat = Date.now();
    const configured = !!getXaiApiKey();
    return {
      serviceName: this.serviceName,
      status: configured ? "healthy" : "degraded",
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastHeartbeat: this.lastHeartbeat,
      version: this.version,
      details: {
        xaiConfigured: configured,
        lastTask: this.lastResult?.task ?? null,
        lastModel: this.lastResult?.model ?? null,
      },
    };
  }

  public async run(req: CodingAgentRequest, env?: Record<string, any>): Promise<CodingAgentResponse> {
    this.lastHeartbeat = Date.now();

    try {
      if (!req.instruction?.trim() && !req.code?.trim()) {
        throw new Error("instruction or code is required");
      }

      const task: CodingTask = req.task || "generate";
      const language = req.language || "typescript";

      const messages = [
        { role: "system", content: SYSTEM_PROMPTS[task] },
      ] as any[];

      let userContent = `Task: ${task}\nLanguage: ${language}\n\n`;
      if (req.context) {
        userContent += `### Repository / extra context\n${req.context}\n\n`;
      }
      if (req.code) {
        userContent += `### Current code\n\n${req.code}\n\n`;
      }
      userContent += `### Instruction\n${req.instruction}`;

      messages.push({ role: "user", content: userContent });

      const result = await xaiChatCompletion(messages, {
        model: req.model,
        temperature: task === "generate" || task === "refactor" ? 0.3 : 0.15,
        max_tokens: 8192,
      }, env);

      const response: CodingAgentResponse = {
        success: true,
        task,
        result: result.content,
        model: result.model,
        usage: result.usage,
      };
      this.lastResult = response;
      return response;
    } catch (err: any) {
      const response: CodingAgentResponse = {
        success: false,
        task: req.task || "generate",
        result: "",
        model: req.model || "unknown",
        error: err?.message || String(err),
      };
      this.lastResult = response;
      return response;
    }
  }
}
