/**
 * MERIDIAN CENTRAL MODEL ENGINE
 * 
 * Orchestrates multi-provider waterfall routing, dynamic provider registration,
 * automated retries with exponential backoff, JSON sanitization, and token budgeting.
 */

import {
  IModelProvider,
  ModelChatRequest,
  ModelChatResponse,
  ModelEngineOptions,
  ModelPricing
} from "./types";
import { cleanJsonText } from "../arxivUtils";

export class ModelEngine {
  private providers: Map<string, IModelProvider> = new Map();
  private defaultProvider: string;
  private defaultModel: string;
  private fallbackProviders: string[];
  private defaultTimeoutMs: number;
  private maxRetries: number;
  private pricingTable: Record<string, ModelPricing>;

  constructor(options: ModelEngineOptions = {}) {
    this.defaultProvider = options.defaultProvider || "github_models";
    this.defaultModel = options.defaultModel || "gpt-4o-mini";
    this.fallbackProviders = options.fallbackProviders || [];
    this.defaultTimeoutMs = options.timeoutMs || 15000;
    this.maxRetries = options.maxRetries ?? 2;
    this.pricingTable = options.pricingTable || {
      "gpt-4o-mini": { promptCostPerMillion: 0.15, candidateCostPerMillion: 0.60 },
      "gpt-4o": { promptCostPerMillion: 2.50, candidateCostPerMillion: 10.00 },
      "claude-3-5-sonnet": { promptCostPerMillion: 3.00, candidateCostPerMillion: 15.00 },
      "deepseek-chat": { promptCostPerMillion: 0.14, candidateCostPerMillion: 0.28 },
      "grok-2-latest": { promptCostPerMillion: 2.00, candidateCostPerMillion: 10.00 }
    };
  }

  // --- PROVIDER REGISTRATION & EXTENSION ---

  public registerProvider(provider: IModelProvider): this {
    this.providers.set(provider.name, provider);
    return this;
  }

  public getProvider(name: string): IModelProvider | undefined {
    return this.providers.get(name);
  }

  public hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  public listProviders(): Array<{ name: string; configured: boolean; supportedModels: string[] }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      configured: p.isConfigured(),
      supportedModels: p.listSupportedModels()
    }));
  }

  // --- DYNAMIC CONFIGURATION ---

  public setDefaultProvider(name: string): this {
    if (!this.providers.has(name)) {
      console.warn(`[ModelEngine] Notice: Setting default provider to '${name}', which is not yet registered.`);
    }
    this.defaultProvider = name;
    return this;
  }

  public getDefaultProvider(): string {
    return this.defaultProvider;
  }

  public setDefaultModel(model: string): this {
    this.defaultModel = model;
    return this;
  }

  public getDefaultModel(): string {
    return this.defaultModel;
  }

  public setFallbackProviders(providers: string[]): this {
    this.fallbackProviders = [...providers];
    return this;
  }

  public setPricing(modelName: string, pricing: ModelPricing): this {
    this.pricingTable[modelName] = pricing;
    return this;
  }

  // --- CORE EXECUTION PIPELINE ---

  /**
   * Executes model chat completion with automatic provider waterfall failover
   */
  public async executeChat(
    request: ModelChatRequest,
    executionOptions?: {
      provider?: string;
      fallbackProviders?: string[];
      forceModel?: string;
      retries?: number;
    }
  ): Promise<ModelChatResponse> {
    const primaryProviderName = executionOptions?.provider || request.provider || this.defaultProvider;
    const fallbackList = executionOptions?.fallbackProviders || this.fallbackProviders;
    const providersToTry = [
      primaryProviderName,
      ...fallbackList.filter((p) => p !== primaryProviderName)
    ];

    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;
    const retriesPerProvider = executionOptions?.retries ?? this.maxRetries;

    const errors: Array<{ provider: string; error: string }> = [];

    for (const providerName of providersToTry) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        errors.push({ provider: providerName, error: "Provider not registered in ModelEngine." });
        continue;
      }

      if (!provider.isConfigured()) {
        errors.push({ provider: providerName, error: "Provider is not configured (missing credentials/token)." });
        continue;
      }

      // Determine model: explicit force/request model, or default if supported, or provider's primary model
      const supported = provider.listSupportedModels();
      let modelToUse = executionOptions?.forceModel || request.model;
      if (!modelToUse) {
        if (supported.includes(this.defaultModel)) {
          modelToUse = this.defaultModel;
        } else if (supported.length > 0) {
          modelToUse = supported[0];
        } else {
          modelToUse = this.defaultModel;
        }
      }

      const requestPayload: ModelChatRequest = {
        ...request,
        model: modelToUse,
        timeoutMs
      };

      // Retry loop for the active provider
      for (let attempt = 0; attempt <= retriesPerProvider; attempt++) {
        try {
          const response = await provider.executeChat(requestPayload);
          
          // Re-calculate cost using centralized pricing table if configured
          if (response && response.tokenUsage) {
            const pricing = this.pricingTable[response.model] || this.pricingTable[this.defaultModel];
            if (pricing) {
              const pCost = (response.tokenUsage.promptTokens / 1_000_000) * pricing.promptCostPerMillion;
              const cCost = (response.tokenUsage.candidateTokens / 1_000_000) * pricing.candidateCostPerMillion;
              response.tokenUsage.estimatedCostUsd = Number((pCost + cCost).toFixed(6));
            }
          }

          return response;
        } catch (err: any) {
          const isLastAttempt = attempt === retriesPerProvider;
          if (isLastAttempt) {
            errors.push({ provider: providerName, error: err?.message || String(err) });
          } else {
            // Exponential backoff
            const backoffMs = Math.min(2000, 150 * Math.pow(2, attempt));
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }
    }

    const failureSummary = errors.map((e) => `[${e.provider}]: ${e.error}`).join(" | ");
    throw new Error(`[ModelEngine] All inference providers failed. Summary: ${failureSummary}`);
  }

  /**
   * Executes model inference and parses/sanitizes output strictly as valid JSON of type T.
   */
  public async executeChatJson<T = any>(
    request: ModelChatRequest,
    executionOptions?: {
      provider?: string;
      fallbackProviders?: string[];
      forceModel?: string;
      retries?: number;
    }
  ): Promise<{ data: T; response: ModelChatResponse }> {
    const jsonRequest: ModelChatRequest = {
      ...request,
      jsonMode: true
    };

    const response = await this.executeChat(jsonRequest, executionOptions);
    const cleanedText = cleanJsonText(response.content);

    try {
      const parsed = JSON.parse(cleanedText) as T;
      return { data: parsed, response };
    } catch (parseErr: any) {
      throw new Error(`[ModelEngine] Failed to parse model output as JSON: ${parseErr.message}. Raw: ${response.content.slice(0, 120)}...`);
    }
  }
}
