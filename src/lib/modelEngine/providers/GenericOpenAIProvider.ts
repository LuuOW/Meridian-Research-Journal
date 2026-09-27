/**
 * GENERIC OPENAI-COMPATIBLE MODEL PROVIDER
 * 
 * Scalable adapter for any LLM provider adhering to the OpenAI Chat Completions API schema
 * (e.g. OpenAI official, DeepSeek, Grok/xAI, Together AI, Groq, Ollama, Local vLLM).
 */

import { IModelProvider, ModelChatRequest, ModelChatResponse } from "../types";

export interface GenericOpenAIConfig {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  supportedModels?: string[];
  fetchFn?: typeof fetch;
}

export class GenericOpenAIProvider implements IModelProvider {
  public readonly name: string;
  private baseUrl: string;
  private apiKey?: string;
  private defaultModel: string;
  private supportedModels: string[];
  private fetchFn: typeof fetch;

  constructor(config: GenericOpenAIConfig = {}) {
    this.name = config.name || "openai_compatible";
    this.baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || "gpt-4o-mini";
    this.supportedModels = config.supportedModels || [this.defaultModel];
    this.fetchFn = config.fetchFn || fetch;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
  }

  public listSupportedModels(): string[] {
    return [...this.supportedModels];
  }

  public async executeChat(request: ModelChatRequest): Promise<ModelChatResponse> {
    if (!this.isConfigured()) {
      throw new Error(`[${this.name}] API key is not configured.`);
    }

    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const timeoutMs = request.timeoutMs || 15000;

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    if (request.messages && request.messages.length > 0) {
      messages.push(...request.messages);
    } else if (request.userPrompt) {
      messages.push({ role: "user", content: request.userPrompt });
    }

    const bodyPayload: Record<string, unknown> = {
      model,
      messages,
      temperature: request.temperature ?? 0.7
    };

    if (request.maxTokens) {
      bodyPayload.max_tokens = request.maxTokens;
    }

    if (request.jsonMode) {
      bodyPayload.response_format = { type: "json_object" };
    }

    const endpoint = `${this.baseUrl}/chat/completions`;

    const res = await this.fetchFn(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "User-Agent": `Meridian-${this.name}/1.0`
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`[${this.name}] HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const usage = data?.usage || {};
    const promptTokens = usage.prompt_tokens || Math.max(1, Math.ceil(JSON.stringify(messages).length / 4));
    const candidateTokens = usage.completion_tokens || Math.max(1, Math.ceil(content.length / 4));

    return {
      content: content.trim(),
      model,
      provider: this.name,
      tokenUsage: {
        promptTokens,
        candidateTokens,
        totalTokens: promptTokens + candidateTokens,
        estimatedCostUsd: (promptTokens * 0.00000015) + (candidateTokens * 0.0000006)
      },
      latencyMs: Date.now() - startTime,
      finishReason: data?.choices?.[0]?.finish_reason || "stop",
      raw: data
    };
  }
}
