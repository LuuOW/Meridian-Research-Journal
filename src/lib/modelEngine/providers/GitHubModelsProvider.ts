/**
 * GITHUB MODELS PROVIDER IMPLEMENTATION
 * 
 * Interacts with GitHub Models inference endpoints with automatic
 * multi-endpoint failover, JSON mode enforcement, and token pricing.
 */

import { IModelProvider, ModelChatRequest, ModelChatResponse } from "../types";

export interface GitHubModelsConfig {
  token?: string;
  defaultModel?: string;
  candidateModels?: string[];
  endpoints?: string[];
  userAgent?: string;
  fetchFn?: typeof fetch;
}

export class GitHubModelsProvider implements IModelProvider {
  public readonly name = "github_models";

  private token?: string;
  private defaultModel: string;
  private candidateModels: string[];
  private endpoints: string[];
  private userAgent: string;
  private fetchFn: typeof fetch;

  constructor(config: GitHubModelsConfig = {}) {
    this.token = config.token ?? (typeof process !== "undefined" ? process.env?.GITHUB_TOKEN : undefined);
    this.defaultModel = config.defaultModel || "gpt-4o-mini";
    this.candidateModels = config.candidateModels || [
      "gpt-4o-mini",
      "gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-4o"
    ];
    this.endpoints = config.endpoints || [
      "https://models.github.ai/inference/chat/completions",
      "https://models.inference.ai.azure.com/chat/completions"
    ];
    this.userAgent = config.userAgent || "Meridian-ModelEngine/2.5";
    this.fetchFn = config.fetchFn || fetch;
  }

  public isConfigured(): boolean {
    return Boolean(this.token && this.token.trim().length > 0);
  }

  public setToken(token: string): void {
    this.token = token;
  }

  public listSupportedModels(): string[] {
    return [...this.candidateModels];
  }

  public async executeChat(request: ModelChatRequest): Promise<ModelChatResponse> {
    if (!this.isConfigured()) {
      throw new Error(`[${this.name}] GITHUB_TOKEN is not configured in the environment.`);
    }

    const startTime = Date.now();
    const modelToUse = request.model || this.defaultModel;
    const timeoutMs = request.timeoutMs || 12000;

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    if (request.messages && request.messages.length > 0) {
      messages.push(...request.messages);
    } else if (request.userPrompt) {
      messages.push({ role: "user", content: request.userPrompt });
    }

    if (messages.length === 0) {
      throw new Error(`[${this.name}] Cannot execute chat: No prompt or messages provided.`);
    }

    const candidateModels = [
      modelToUse,
      ...this.candidateModels.filter((m) => m !== modelToUse)
    ];

    let lastError: Error | null = null;

    for (const endpoint of this.endpoints) {
      for (const candidate of candidateModels) {
        try {
          const bodyPayload: Record<string, unknown> = {
            model: candidate,
            messages,
            temperature: request.temperature ?? 0.7
          };

          if (request.maxTokens) {
            bodyPayload.max_tokens = request.maxTokens;
          }

          if (request.jsonMode) {
            bodyPayload.response_format = { type: "json_object" };
          }

          const res = await this.fetchFn(endpoint, {
            method: "POST",
            signal: AbortSignal.timeout(timeoutMs),
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${this.token}`,
              "User-Agent": this.userAgent
            },
            body: JSON.stringify(bodyPayload)
          });

          if (res.ok) {
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("json")) {
              lastError = new Error(`[${this.name}] Endpoint ${endpoint} returned non-JSON content-type: ${contentType}`);
              continue;
            }
            const data: any = await res.json();
            const choice = data?.choices?.[0];
            const content = choice?.message?.content;

            if (content && typeof content === "string" && content.trim().length > 0) {
              const usage = data?.usage || {};
              const promptTokens = usage.prompt_tokens || Math.max(1, Math.ceil(JSON.stringify(messages).length / 4));
              const candidateTokens = usage.completion_tokens || Math.max(1, Math.ceil(content.length / 4));
              const totalTokens = usage.total_tokens || (promptTokens + candidateTokens);

              // Pricing: gpt-4o-mini ~$0.15 / 1M prompt, $0.60 / 1M completion
              const isFull4o = candidate.includes("gpt-4o") && !candidate.includes("mini");
              const pRate = isFull4o ? 0.0000025 : 0.00000015;
              const cRate = isFull4o ? 0.0000100 : 0.00000060;
              const estimatedCostUsd = (promptTokens * pRate) + (candidateTokens * cRate);

              return {
                content: content.trim(),
                model: candidate,
                provider: this.name,
                tokenUsage: {
                  promptTokens,
                  candidateTokens,
                  totalTokens,
                  estimatedCostUsd: Number(estimatedCostUsd.toFixed(6))
                },
                latencyMs: Date.now() - startTime,
                finishReason: choice?.finish_reason || "stop",
                raw: data
              };
            }
          } else {
            const errBody = await res.text().catch(() => "");
            lastError = new Error(`[${this.name}] HTTP ${res.status} from ${endpoint} (${candidate}): ${errBody.slice(0, 150)}`);
          }
        } catch (callErr: any) {
          lastError = callErr;
        }
      }
    }

    throw lastError || new Error(`[${this.name}] Failed to generate completion across all candidate endpoints and models.`);
  }
}
