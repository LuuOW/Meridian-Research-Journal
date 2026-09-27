/**
 * MERIDIAN MODULAR MODEL ENGINE
 * 
 * Central export hub for providers, types, engine orchestrator, and default instance.
 */

import { ModelEngine } from "./ModelEngine";
import { GitHubModelsProvider } from "./providers/GitHubModelsProvider";
import { GenericOpenAIProvider } from "./providers/GenericOpenAIProvider";
import { MockModelProvider } from "./providers/MockModelProvider";
import { ProceduralScholarProvider } from "./providers/ProceduralScholarProvider";

export * from "./types";
export * from "./ModelEngine";
export * from "./providers/GitHubModelsProvider";
export * from "./providers/GenericOpenAIProvider";
export * from "./providers/MockModelProvider";
export * from "./providers/ProceduralScholarProvider";

/**
 * Creates a pre-configured production ModelEngine with GitHub Models as primary
 * and extensible fallback support.
 */
export function createDefaultModelEngine(): ModelEngine {
  const engine = new ModelEngine({
    defaultProvider: "github_models",
    defaultModel: "gpt-4o-mini",
    fallbackProviders: ["procedural"],
    timeoutMs: 12000,
    maxRetries: 1
  });

  // 1. Register primary GitHub Models provider
  const ghProvider = new GitHubModelsProvider();
  engine.registerProvider(ghProvider);

  // 2. Register zero-failure Procedural Scholar fallback provider
  const proceduralProvider = new ProceduralScholarProvider();
  engine.registerProvider(proceduralProvider);

  const fallbacks = ["procedural"];

  // If OpenAI or custom endpoint credentials exist, register them as seamless fallbacks
  if (typeof process !== "undefined" && process.env?.OPENAI_API_KEY) {
    const openaiProvider = new GenericOpenAIProvider({
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      defaultModel: "gpt-4o-mini"
    });
    engine.registerProvider(openaiProvider);
    fallbacks.unshift("openai");
  }

  // DeepSeek / OpenRouter / Groq / Local Ollama generic registration if configured
  if (typeof process !== "undefined" && process.env?.DEEPSEEK_API_KEY) {
    const deepseekProvider = new GenericOpenAIProvider({
      name: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: "https://api.deepseek.com/v1",
      defaultModel: "deepseek-chat"
    });
    engine.registerProvider(deepseekProvider);
    fallbacks.unshift("deepseek");
  }

  engine.setFallbackProviders(fallbacks);

  return engine;
}

export const defaultModelEngine = createDefaultModelEngine();
