/**
 * MOCK MODEL PROVIDER FOR UNIT TESTING & DETERMINISTIC SIMULATION
 */

import { IModelProvider, ModelChatRequest, ModelChatResponse } from "../types";

export interface MockProviderConfig {
  name?: string;
  configured?: boolean;
  supportedModels?: string[];
  cannedResponses?: string[];
  failureCountBeforeSuccess?: number;
  throwError?: Error;
  delayMs?: number;
}

export class MockModelProvider implements IModelProvider {
  public readonly name: string;
  private configured: boolean;
  private supportedModels: string[];
  private cannedResponses: string[];
  private failureCountBeforeSuccess: number;
  private currentFailures: number = 0;
  private throwError?: Error;
  private delayMs: number;

  public callHistory: ModelChatRequest[] = [];

  constructor(config: MockProviderConfig = {}) {
    this.name = config.name || "mock_provider";
    this.configured = config.configured ?? true;
    this.supportedModels = config.supportedModels || ["mock-model-v1", "mock-model-v2"];
    this.cannedResponses = config.cannedResponses || [
      JSON.stringify({
        title: "Mock Generated Research Paper",
        slug: "mock-generated-research-paper",
        excerpt: "An executive abstract of mock mathematical formulations.",
        content: "## Introduction\n\nMock content with equation $$\\mathcal{H} = \\hbar \\omega$$.",
        author: "Mock Researcher",
        tags: ["Quantum", "Optics"]
      })
    ];
    this.failureCountBeforeSuccess = config.failureCountBeforeSuccess || 0;
    this.throwError = config.throwError;
    this.delayMs = config.delayMs || 0;
  }

  public isConfigured(): boolean {
    return this.configured;
  }

  public setConfigured(configured: boolean): void {
    this.configured = configured;
  }

  public listSupportedModels(): string[] {
    return [...this.supportedModels];
  }

  public setNextError(err: Error): void {
    this.throwError = err;
  }

  public resetHistory(): void {
    this.callHistory = [];
    this.currentFailures = 0;
  }

  public async executeChat(request: ModelChatRequest): Promise<ModelChatResponse> {
    const startTime = Date.now();
    this.callHistory.push(request);

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.throwError) {
      const err = this.throwError;
      this.throwError = undefined;
      throw err;
    }

    if (this.currentFailures < this.failureCountBeforeSuccess) {
      this.currentFailures++;
      throw new Error(`[${this.name}] Simulated temporary failure #${this.currentFailures}`);
    }

    const responseIndex = (this.callHistory.length - 1) % this.cannedResponses.length;
    const content = this.cannedResponses[responseIndex];
    const model = request.model || this.supportedModels[0];

    const promptText = (request.systemPrompt || "") + (request.userPrompt || "") +
      (request.messages?.map((m) => m.content).join(" ") || "");
    const promptTokens = Math.max(1, Math.ceil(promptText.length / 4));
    const candidateTokens = Math.max(1, Math.ceil(content.length / 4));

    return {
      content,
      model,
      provider: this.name,
      tokenUsage: {
        promptTokens,
        candidateTokens,
        totalTokens: promptTokens + candidateTokens,
        estimatedCostUsd: (promptTokens * 0.00000015) + (candidateTokens * 0.0000006)
      },
      latencyMs: Date.now() - startTime,
      finishReason: "stop"
    };
  }
}
