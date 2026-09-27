/**
 * MERIDIAN MODULAR MODEL ENGINE - TYPES & CONTRACTS
 * 
 * Highly scalable, provider-agnostic abstractions for AI inference.
 * Enables zero-downtime hot-swapping between GitHub Models, OpenAI, Anthropic,
 * DeepSeek, Grok, Ollama, or any future LLM provider.
 */

export type ModelRole = "system" | "user" | "assistant";

export interface ModelChatMessage {
  role: ModelRole;
  content: string;
}

export interface ModelTokenUsage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface ModelChatRequest {
  systemPrompt?: string;
  userPrompt?: string;
  messages?: ModelChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  provider?: string;
}

export interface ModelChatResponse {
  content: string;
  model: string;
  provider: string;
  tokenUsage: ModelTokenUsage;
  latencyMs: number;
  finishReason?: string;
  raw?: unknown;
}

export interface ModelPricing {
  promptCostPerMillion: number;
  candidateCostPerMillion: number;
}

/**
 * Universal interface for all AI model providers.
 * Any new model engine (e.g. Claude, DeepSeek, Local Ollama) implements this contract.
 */
export interface IModelProvider {
  /** Unique provider identifier (e.g. "github_models", "openai", "deepseek", "anthropic") */
  readonly name: string;
  
  /** Whether the provider has required credentials/configuration active */
  isConfigured(): boolean;
  
  /** List of supported models for this provider */
  listSupportedModels(): string[];
  
  /** Primary execution method */
  executeChat(request: ModelChatRequest): Promise<ModelChatResponse>;
}

export interface ModelEngineOptions {
  defaultProvider?: string;
  defaultModel?: string;
  fallbackProviders?: string[];
  timeoutMs?: number;
  maxRetries?: number;
  pricingTable?: Record<string, ModelPricing>;
}
