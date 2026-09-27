/**
 * MERIDIAN MODULAR MODEL ENGINE - COMPREHENSIVE UNIT TEST SUITE
 * 
 * Verifies high scalability, dynamic provider registration, hot-swapping between
 * GitHub Models and future models (OpenAI, DeepSeek, Anthropic, Local LLMs),
 * waterfall fallback, JSON mode sanitization, retry backoff, and token economics.
 */

import { test } from "node:test";
import assert from "node:assert";
import {
  ModelEngine,
  IModelProvider,
  ModelChatRequest,
  ModelChatResponse,
  MockModelProvider,
  GitHubModelsProvider,
  GenericOpenAIProvider,
  createDefaultModelEngine
} from "./modelEngine";

// -----------------------------------------------------------------------------
// 1. ENGINE INSTANTIATION & DYNAMIC REGISTRATION
// -----------------------------------------------------------------------------

test("ModelEngine: Initializes with defaults and registers providers dynamically", () => {
  const engine = new ModelEngine({
    defaultProvider: "github_models",
    defaultModel: "gpt-4o-mini"
  });

  assert.strictEqual(engine.getDefaultProvider(), "github_models");
  assert.strictEqual(engine.getDefaultModel(), "gpt-4o-mini");

  const mockProvider = new MockModelProvider({ name: "test_provider" });
  engine.registerProvider(mockProvider);

  assert.strictEqual(engine.hasProvider("test_provider"), true);
  assert.strictEqual(engine.hasProvider("non_existent"), false);

  const providers = engine.listProviders();
  assert.strictEqual(providers.length, 1);
  assert.strictEqual(providers[0].name, "test_provider");
  assert.strictEqual(providers[0].configured, true);
});

// -----------------------------------------------------------------------------
// 2. MODEL & PROVIDER HOT-SWAPPING (TOMORROW'S MODEL SWITCHING)
// -----------------------------------------------------------------------------

test("ModelEngine: Hot-swaps default provider and default model seamlessly", async () => {
  const engine = new ModelEngine();

  const mockA = new MockModelProvider({
    name: "provider_a",
    supportedModels: ["model-alpha"],
    cannedResponses: ["Response from Alpha"]
  });

  const mockB = new MockModelProvider({
    name: "provider_b",
    supportedModels: ["model-beta"],
    cannedResponses: ["Response from Beta"]
  });

  engine.registerProvider(mockA);
  engine.registerProvider(mockB);

  // Set default to provider_a
  engine.setDefaultProvider("provider_a");
  engine.setDefaultModel("model-alpha");

  let res = await engine.executeChat({ userPrompt: "Hello" });
  assert.strictEqual(res.provider, "provider_a");
  assert.strictEqual(res.model, "model-alpha");
  assert.strictEqual(res.content, "Response from Alpha");

  // Zero-downtime hot-swap to provider_b
  engine.setDefaultProvider("provider_b");
  engine.setDefaultModel("model-beta");

  res = await engine.executeChat({ userPrompt: "Hello" });
  assert.strictEqual(res.provider, "provider_b");
  assert.strictEqual(res.model, "model-beta");
  assert.strictEqual(res.content, "Response from Beta");
});

test("ModelEngine: Extensibility - registers an arbitrary custom provider in 5 lines", async () => {
  const engine = new ModelEngine();

  // Custom provider created on the fly (e.g. Anthropic, DeepSeek, Local Ollama)
  const customDeepSeekProvider: IModelProvider = {
    name: "deepseek_v3",
    isConfigured: () => true,
    listSupportedModels: () => ["deepseek-chat", "deepseek-reasoner"],
    executeChat: async (req: ModelChatRequest): Promise<ModelChatResponse> => ({
      content: `DeepSeek synthesized response for: ${req.userPrompt}`,
      model: req.model || "deepseek-chat",
      provider: "deepseek_v3",
      tokenUsage: { promptTokens: 100, candidateTokens: 250, totalTokens: 350, estimatedCostUsd: 0.000084 },
      latencyMs: 45
    })
  };

  engine.registerProvider(customDeepSeekProvider);
  engine.setDefaultProvider("deepseek_v3");

  const res = await engine.executeChat({
    userPrompt: "Calculate topological invariant for photonic band gap"
  });

  assert.strictEqual(res.provider, "deepseek_v3");
  assert.strictEqual(res.model, "deepseek-chat");
  assert.ok(res.content.includes("DeepSeek synthesized response"));
});

// -----------------------------------------------------------------------------
// 3. WATERFALL FAILOVER & FAULT TOLERANCE
// -----------------------------------------------------------------------------

test("ModelEngine: Waterfall failover cascades from primary to fallback when primary fails", async () => {
  const engine = new ModelEngine();

  // Failing primary provider (e.g. rate limit, 500 error, or invalid token)
  const failingPrimary = new MockModelProvider({
    name: "primary_gh_models",
    throwError: new Error("HTTP 429: Rate limit exceeded on GitHub Models")
  });

  // Reliable secondary fallback provider (e.g. OpenAI or Grok)
  const secondaryFallback = new MockModelProvider({
    name: "secondary_fallback",
    cannedResponses: ["Fallback successfully recovered inference"]
  });

  engine.registerProvider(failingPrimary);
  engine.registerProvider(secondaryFallback);

  engine.setDefaultProvider("primary_gh_models");
  engine.setFallbackProviders(["secondary_fallback"]);

  const res = await engine.executeChat({ userPrompt: "Generate arXiv blog" }, { retries: 0 });

  assert.strictEqual(res.provider, "secondary_fallback");
  assert.strictEqual(res.content, "Fallback successfully recovered inference");
});

test("ModelEngine: Skips unconfigured providers in waterfall", async () => {
  const engine = new ModelEngine();

  const unconfiguredProvider = new MockModelProvider({
    name: "unconfigured_provider",
    configured: false
  });

  const configuredFallback = new MockModelProvider({
    name: "configured_fallback",
    configured: true,
    cannedResponses: ["Answer from configured fallback"]
  });

  engine.registerProvider(unconfiguredProvider);
  engine.registerProvider(configuredFallback);

  engine.setDefaultProvider("unconfigured_provider");
  engine.setFallbackProviders(["configured_fallback"]);

  const res = await engine.executeChat({ userPrompt: "Test unconfigured bypass" });
  assert.strictEqual(res.provider, "configured_fallback");
  assert.strictEqual(res.content, "Answer from configured fallback");
});

test("ModelEngine: Aggregates and reports descriptive errors if all providers fail", async () => {
  const engine = new ModelEngine();

  const provider1 = new MockModelProvider({
    name: "prov_1",
    throwError: new Error("Network timeout")
  });

  const provider2 = new MockModelProvider({
    name: "prov_2",
    throwError: new Error("Quota exceeded")
  });

  engine.registerProvider(provider1);
  engine.registerProvider(provider2);
  engine.setDefaultProvider("prov_1");
  engine.setFallbackProviders(["prov_2"]);

  await assert.rejects(
    async () => {
      await engine.executeChat({ userPrompt: "Should fail" }, { retries: 0 });
    },
    (err: any) => {
      assert.ok(err.message.includes("[prov_1]: Network timeout"));
      assert.ok(err.message.includes("[prov_2]: Quota exceeded"));
      return true;
    }
  );
});

// -----------------------------------------------------------------------------
// 4. RETRY MECHANISM WITH EXPONENTIAL BACKOFF
// -----------------------------------------------------------------------------

test("ModelEngine: Retries transient errors and succeeds when failure recovers", async () => {
  const engine = new ModelEngine();

  // Fails once, then succeeds on retry 2
  const transientProvider = new MockModelProvider({
    name: "transient_provider",
    failureCountBeforeSuccess: 1,
    cannedResponses: ["Succeeded on retry!"]
  });

  engine.registerProvider(transientProvider);
  engine.setDefaultProvider("transient_provider");

  const res = await engine.executeChat({ userPrompt: "Test retry" }, { retries: 2 });
  assert.strictEqual(res.content, "Succeeded on retry!");
  assert.strictEqual(transientProvider.callHistory.length, 2);
});

// -----------------------------------------------------------------------------
// 5. JSON MODE & SCHEMA SANITIZATION
// -----------------------------------------------------------------------------

test("ModelEngine: executeChatJson sanitizes markdown code blocks and parses JSON", async () => {
  const engine = new ModelEngine();

  const jsonProvider = new MockModelProvider({
    name: "json_provider",
    cannedResponses: [
      "```json\n{\n  \"title\": \"Quantum Squeezing in Silicon Waveguides\",\n  \"formulaCount\": 4\n}\n```"
    ]
  });

  engine.registerProvider(jsonProvider);
  engine.setDefaultProvider("json_provider");

  interface SampleOutput {
    title: string;
    formulaCount: number;
  }

  const { data, response } = await engine.executeChatJson<SampleOutput>({
    userPrompt: "Generate article metadata"
  });

  assert.strictEqual(data.title, "Quantum Squeezing in Silicon Waveguides");
  assert.strictEqual(data.formulaCount, 4);
  assert.strictEqual(response.provider, "json_provider");
});

test("ModelEngine: executeChatJson rejects malformed output with clear context", async () => {
  const engine = new ModelEngine();

  const badJsonProvider = new MockModelProvider({
    name: "bad_json_provider",
    cannedResponses: ["This is clearly plain text not JSON at all"]
  });

  engine.registerProvider(badJsonProvider);
  engine.setDefaultProvider("bad_json_provider");

  await assert.rejects(
    async () => {
      await engine.executeChatJson({ userPrompt: "Give me json" });
    },
    (err: any) => {
      assert.ok(err.message.includes("Failed to parse model output as JSON"));
      return true;
    }
  );
});

// -----------------------------------------------------------------------------
// 6. TOKEN USAGE & PRICING CALCULATOR
// -----------------------------------------------------------------------------

test("ModelEngine: Applies custom pricing table accurately across models", async () => {
  const engine = new ModelEngine();

  const provider = new MockModelProvider({
    name: "priced_provider",
    supportedModels: ["premium-llm-v1"],
    cannedResponses: ["A".repeat(400)] // ~100 candidate tokens
  });

  engine.registerProvider(provider);
  engine.setDefaultProvider("priced_provider");
  engine.setDefaultModel("premium-llm-v1");

  // Set explicit pricing ($2.00 / 1M prompt, $10.00 / 1M completion)
  engine.setPricing("premium-llm-v1", {
    promptCostPerMillion: 2.00,
    candidateCostPerMillion: 10.00
  });

  const res = await engine.executeChat({
    userPrompt: "A".repeat(800) // ~200 prompt tokens
  });

  assert.ok(res.tokenUsage.totalTokens > 0);
  assert.ok(res.tokenUsage.estimatedCostUsd > 0);
  // ~200 * 2/1M + ~100 * 10/1M = ~0.0004 + ~0.0010 = ~0.0014
  assert.ok(res.tokenUsage.estimatedCostUsd >= 0.0005 && res.tokenUsage.estimatedCostUsd <= 0.003);
});

// -----------------------------------------------------------------------------
// 7. GITHUB MODELS PROVIDER ADAPTER TESTS
// -----------------------------------------------------------------------------

test("GitHubModelsProvider: Validates token configuration", () => {
  const unconfigured = new GitHubModelsProvider({ token: "" });
  assert.strictEqual(unconfigured.isConfigured(), false);

  const configured = new GitHubModelsProvider({ token: "ghp_mock_token_12345" });
  assert.strictEqual(configured.isConfigured(), true);
  assert.strictEqual(configured.name, "github_models");
  assert.ok(configured.listSupportedModels().includes("gpt-4o-mini"));
  assert.ok(configured.listSupportedModels().includes("gpt-4o"));
});

test("GitHubModelsProvider: Handles missing prompt with immediate validation error", async () => {
  const provider = new GitHubModelsProvider({ token: "ghp_test_token" });

  await assert.rejects(
    async () => {
      await provider.executeChat({});
    },
    (err: any) => {
      assert.ok(err.message.includes("No prompt or messages provided"));
      return true;
    }
  );
});

test("GitHubModelsProvider: Sends compliant payload and headers to endpoints", async () => {
  let capturedUrl = "";
  let capturedHeaders: Record<string, string> = {};
  let capturedBody: any = null;

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = (init?.headers as Record<string, string>) || {};
    capturedBody = JSON.parse(String(init?.body || "{}"));

    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        choices: [
          {
            message: { role: "assistant", content: "Successful GitHub Models Inference" },
            finish_reason: "stop"
          }
        ],
        usage: { prompt_tokens: 42, completion_tokens: 18, total_tokens: 60 }
      })
    } as any;
  };

  const provider = new GitHubModelsProvider({
    token: "ghp_secret_token",
    fetchFn: mockFetch
  });

  const res = await provider.executeChat({
    systemPrompt: "You are an elite researcher.",
    userPrompt: "Explain Kerr solitons",
    jsonMode: true
  });

  assert.strictEqual(res.content, "Successful GitHub Models Inference");
  assert.strictEqual(res.provider, "github_models");
  assert.strictEqual(capturedHeaders["Authorization"], "Bearer ghp_secret_token");
  assert.strictEqual(capturedHeaders["Content-Type"], "application/json");
  assert.strictEqual(capturedBody.response_format?.type, "json_object");
  assert.strictEqual(capturedBody.messages.length, 2);
  assert.strictEqual(capturedBody.messages[0].role, "system");
  assert.strictEqual(capturedBody.messages[1].role, "user");
});

test("GitHubModelsProvider: Multi-endpoint failover - tries secondary endpoint if primary fails", async () => {
  const attemptedUrls: string[] = [];

  const mockFetch: typeof fetch = async (input) => {
    attemptedUrls.push(String(input));

    // First endpoint (models.github.ai) fails with 503
    if (String(input).includes("models.github.ai")) {
      return {
        ok: false,
        status: 503,
        text: async () => "Service Temporarily Unavailable"
      } as any;
    }

    // Second endpoint (models.inference.ai.azure.com) succeeds
    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        choices: [{ message: { content: "Azure endpoint success" } }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    } as any;
  };

  const provider = new GitHubModelsProvider({
    token: "ghp_secret_token",
    fetchFn: mockFetch
  });

  const res = await provider.executeChat({ userPrompt: "Test failover" });
  assert.strictEqual(res.content, "Azure endpoint success");
  assert.ok(attemptedUrls.some((u) => u.includes("models.github.ai")));
  assert.ok(attemptedUrls.some((u) => u.includes("models.inference.ai.azure.com")));
});

// -----------------------------------------------------------------------------
// 8. GENERIC OPENAI-COMPATIBLE PROVIDER TESTS (FUTURE MODELS ADAPTER)
// -----------------------------------------------------------------------------

test("GenericOpenAIProvider: Supports custom baseUrl (DeepSeek, Groq, Ollama)", async () => {
  let calledUrl = "";

  const mockFetch: typeof fetch = async (input) => {
    calledUrl = String(input);
    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        choices: [{ message: { content: "DeepSeek Output" } }],
        usage: { prompt_tokens: 25, completion_tokens: 50, total_tokens: 75 }
      })
    } as any;
  };

  const deepseek = new GenericOpenAIProvider({
    name: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-deepseek-mock-key",
    defaultModel: "deepseek-chat",
    fetchFn: mockFetch
  });

  assert.strictEqual(deepseek.isConfigured(), true);
  const res = await deepseek.executeChat({ userPrompt: "Explain topological photonics" });

  assert.strictEqual(res.content, "DeepSeek Output");
  assert.strictEqual(res.model, "deepseek-chat");
  assert.strictEqual(res.provider, "deepseek");
  assert.strictEqual(calledUrl, "https://api.deepseek.com/v1/chat/completions");
});

// -----------------------------------------------------------------------------
// 9. FACTORY FUNCTION & DEFAULT INTEGRATION
// -----------------------------------------------------------------------------

test("createDefaultModelEngine: Instantiates factory with GitHub Models configured", () => {
  const engine = createDefaultModelEngine();
  assert.strictEqual(engine.getDefaultProvider(), "github_models");
  assert.strictEqual(engine.getDefaultModel(), "gpt-4o-mini");
  assert.strictEqual(engine.hasProvider("github_models"), true);
});

// -----------------------------------------------------------------------------
// 10. REALISTIC SCHOLARLY SCHEMA & FUTURE MODEL MIGRATION SUITE
// -----------------------------------------------------------------------------

test("ModelEngine: Full Scholarly Article Generation Schema Validation", async () => {
  const engine = new ModelEngine();

  const scholarlyMockOutput = JSON.stringify({
    title: "Exact Soliton Dynamics in Non-Hermitian Photonic Crystals",
    slug: "exact-soliton-dynamics-non-hermitian-photonic-crystals",
    excerpt: "Analytical formulation of topological edge states governed by exceptional point transitions.",
    author: "Elena Rostova, et al.",
    readingTime: "11 min read",
    tags: ["Non-Hermitian", "Solitons", "Optics", "Topological"],
    content: "## Abstract\n\nWe present rigorous derivations of exceptional point bifurcation.\n\n$$\\det(\\mathbf{H} - \\lambda \\mathbf{I}) = 0$$\n\n## Wave Equation\n\n$$\\nabla^2 \\mathbf{E} + k_0^2 \\epsilon(r) \\mathbf{E} = 0$$"
  });

  const provider = new MockModelProvider({
    name: "github_models",
    cannedResponses: [scholarlyMockOutput]
  });

  engine.registerProvider(provider);

  const { data, response } = await engine.executeChatJson<{
    title: string;
    slug: string;
    excerpt: string;
    author: string;
    readingTime: string;
    tags: string[];
    content: string;
  }>({
    systemPrompt: "You are the Senior Theoretical Physicist at Meridian Research.",
    userPrompt: "Analyze arXiv:2609.11042 on non-Hermitian soliton crystals."
  });

  assert.strictEqual(data.title, "Exact Soliton Dynamics in Non-Hermitian Photonic Crystals");
  assert.strictEqual(data.tags.length, 4);
  assert.ok(data.content.includes("$$\\det("));
  assert.strictEqual(response.provider, "github_models");
});

test("ModelEngine Scalability: Tomorrow's model migration (Anthropic Claude 3.5 Sonnet / Claude 4)", async () => {
  const engine = new ModelEngine();

  // Tomorrow, team decides to plug in Anthropic Claude without touching article generators
  const anthropicProvider: IModelProvider = {
    name: "anthropic",
    isConfigured: () => true,
    listSupportedModels: () => ["claude-3-5-sonnet", "claude-4-opus"],
    executeChat: async (req: ModelChatRequest): Promise<ModelChatResponse> => {
      assert.strictEqual(req.model, "claude-3-5-sonnet");
      return {
        content: JSON.stringify({
          title: "Claude-Powered Wavefront Synthesis",
          insight: "Constructive interference preserved across 12 scattering lengths."
        }),
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        tokenUsage: { promptTokens: 300, candidateTokens: 150, totalTokens: 450, estimatedCostUsd: 0.00315 },
        latencyMs: 120
      };
    }
  };

  engine.registerProvider(anthropicProvider);
  engine.setDefaultProvider("anthropic");
  engine.setDefaultModel("claude-3-5-sonnet");

  const { data } = await engine.executeChatJson<{ title: string; insight: string }>({
    userPrompt: "Generate wavefront synthesis report"
  });

  assert.strictEqual(data.title, "Claude-Powered Wavefront Synthesis");
  assert.ok(data.insight.includes("scattering lengths"));
});

test("ModelEngine Scalability: Tomorrow's model migration (Local Ollama / DeepSeek R1)", async () => {
  const engine = new ModelEngine();

  // Tomorrow, team decides to run open-weights local model (Ollama / vLLM / DeepSeek)
  const localOllamaProvider: IModelProvider = {
    name: "local_ollama",
    isConfigured: () => true,
    listSupportedModels: () => ["deepseek-r1:32b", "llama3.3:70b"],
    executeChat: async (req: ModelChatRequest): Promise<ModelChatResponse> => {
      assert.strictEqual(req.model, "deepseek-r1:32b");
      return {
        content: JSON.stringify({
          reasoningSteps: 4,
          answer: "Quantum state tomography fidelity reached 99.4%."
        }),
        model: "deepseek-r1:32b",
        provider: "local_ollama",
        tokenUsage: { promptTokens: 150, candidateTokens: 80, totalTokens: 230, estimatedCostUsd: 0.0 }, // Local free
        latencyMs: 35
      };
    }
  };

  engine.registerProvider(localOllamaProvider);
  engine.setDefaultProvider("local_ollama");
  engine.setDefaultModel("deepseek-r1:32b");

  const { data, response } = await engine.executeChatJson<{ reasoningSteps: number; answer: string }>({
    userPrompt: "Perform quantum state tomography on squeezed Bell pairs"
  });

  assert.strictEqual(data.reasoningSteps, 4);
  assert.strictEqual(data.answer, "Quantum state tomography fidelity reached 99.4%.");
  assert.strictEqual(response.tokenUsage.estimatedCostUsd, 0.0);
});

test("ModelEngine: Multi-turn message history sequencing and role integrity", async () => {
  const mockProvider = new MockModelProvider({
    name: "multi_turn_mock",
    cannedResponses: ["Assistant follow-up response"]
  });

  const engine = new ModelEngine();
  engine.registerProvider(mockProvider);
  engine.setDefaultProvider("multi_turn_mock");

  const messages = [
    { role: "system" as const, content: "You are a quantum information assistant." },
    { role: "user" as const, content: "What is an exceptional point?" },
    { role: "assistant" as const, content: "An exceptional point is a non-Hermitian degeneracy..." },
    { role: "user" as const, content: "Now calculate its Jordan normal block." }
  ];

  const res = await engine.executeChat({ messages });

  assert.strictEqual(res.content, "Assistant follow-up response");
  assert.strictEqual(mockProvider.callHistory.length, 1);
  assert.strictEqual(mockProvider.callHistory[0].messages?.length, 4);
  assert.strictEqual(mockProvider.callHistory[0].messages?.[3].content, "Now calculate its Jordan normal block.");
});

test("ModelEngine: Handles simulated upstream provider delay gracefully", async () => {
  const engine = new ModelEngine();

  const fastProvider = new MockModelProvider({
    name: "fast_provider",
    delayMs: 15,
    cannedResponses: ["Instant response"]
  });

  engine.registerProvider(fastProvider);
  engine.setDefaultProvider("fast_provider");

  const res = await engine.executeChat({ userPrompt: "Quick latency test" });
  assert.strictEqual(res.content, "Instant response");
  assert.ok(res.latencyMs >= 10);
});

// -----------------------------------------------------------------------------
// 11. ZERO-FAILURE PROCEDURAL SCHOLAR FALLBACK PROVIDER
// -----------------------------------------------------------------------------

test("ProceduralScholarProvider: Synthesizes high-fidelity scholarly article JSON with LaTeX", async () => {
  const { ProceduralScholarProvider } = await import("./modelEngine/providers/ProceduralScholarProvider");
  const provider = new ProceduralScholarProvider();

  assert.strictEqual(provider.name, "procedural");
  assert.strictEqual(provider.isConfigured(), true);

  const res = await provider.executeChat({
    userPrompt: "Paper Title: Wavefront Shaping in Squeezed Light\nPaper Abstract: Mathematical analysis of ballistic vanishing boundaries.",
    jsonMode: true
  });

  assert.strictEqual(res.provider, "procedural");
  const parsed = JSON.parse(res.content);
  assert.ok(parsed.title);
  assert.ok(parsed.content);
  assert.ok(parsed.content.includes("$$"));
  assert.ok(Array.isArray(parsed.tags));
});

test("createDefaultModelEngine: Seamlessly falls back to procedural engine if GitHub Models fails", async () => {
  const engine = createDefaultModelEngine();

  // Inject a simulated failing fetch to GitHub Models
  const failingGhProvider = new GitHubModelsProvider({
    token: "ghp_mock_token",
    fetchFn: async () => {
      throw new TypeError("fetch failed: network sandbox isolation");
    }
  });
  engine.registerProvider(failingGhProvider);

  const res = await engine.executeChat({
    userPrompt: "Paper Title: Non-Hermitian Invariants\nPaper Abstract: Quantum noise suppression.",
    jsonMode: true
  });

  assert.strictEqual(res.provider, "procedural");
  const parsed = JSON.parse(res.content);
  assert.ok(parsed.title);
  assert.ok(parsed.content);
});


