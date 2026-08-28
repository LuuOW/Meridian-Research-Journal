import { PipelineExecutionRecord, PipelineStepMetric, BlogPost } from "../types";

/**
 * Approximate standard token estimation (~4 chars per token for English & LaTeX)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

/**
 * Creates a brand new Pipeline Execution Record tracker
 */
export function createPipelineTracker(
  jobId: string,
  arxivInput: string,
  paperTitle: string,
  authors?: string
): PipelineExecutionRecord {
  const now = Date.now();
  return {
    jobId,
    triggerId: now,
    arxivInput,
    paperTitle: paperTitle || arxivInput,
    authors: authors || "ArXiv Authors",
    status: "running",
    startTime: now,
    tokenUsage: {
      promptTokens: 0,
      candidateTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0
    },
    steps: [
      {
        stepId: 1,
        stepName: "Input Validation & ArXiv ID Parsing",
        category: "ingestion",
        status: "running",
        startTime: now,
        details: `Parsing input: ${arxivInput.slice(0, 60)}`
      }
    ],
    persistenceStatus: {
      customBlogsJson: false,
      dataTs: false,
      journalJsonl: false,
      firestore: false,
      gitHubMirror: false,
      sitemapXml: false
    }
  };
}

/**
 * Transitions a step to completed and starts the next step
 */
export function recordStepProgress(
  tracker: PipelineExecutionRecord,
  currentStepId: number,
  nextStepName: string,
  category: PipelineStepMetric["category"],
  stepDetails?: string,
  tokens?: { input?: number; output?: number; total?: number }
): PipelineExecutionRecord {
  const now = Date.now();
  const updatedSteps = tracker.steps.map((step) => {
    if (step.stepId === currentStepId && step.status === "running") {
      const durationMs = now - step.startTime;
      return {
        ...step,
        status: "completed" as const,
        endTime: now,
        durationMs,
        tokens: tokens || step.tokens
      };
    }
    return step;
  });

  const nextStepId = currentStepId + 1;
  const newStep: PipelineStepMetric = {
    stepId: nextStepId,
    stepName: nextStepName,
    category,
    status: "running",
    startTime: now,
    details: stepDetails
  };

  return {
    ...tracker,
    steps: [...updatedSteps, newStep]
  };
}

/**
 * Finalizes the pipeline execution record upon successful blog synthesis
 */
export function finalizePipelineSuccess(
  tracker: PipelineExecutionRecord,
  blog: BlogPost,
  modelName: string,
  provider: "gemini" | "github_models" | "procedural",
  promptText: string,
  responseText: string,
  persistenceReport?: Partial<PipelineExecutionRecord["persistenceStatus"]>
): PipelineExecutionRecord {
  const now = Date.now();
  const promptTokens = estimateTokens(promptText);
  const candidateTokens = estimateTokens(responseText);
  const totalTokens = promptTokens + candidateTokens;

  // Approximate Gemini Flash API cost ($0.075 / 1M prompt tokens, $0.30 / 1M output tokens)
  const estimatedCost = (promptTokens * 0.000000075) + (candidateTokens * 0.00000030);

  const latexCount = (blog.content.match(/\$\$[\s\S]*?\$\$|\$[^\$\n]+\$/g) || []).length;

  const completedSteps = tracker.steps.map((step) => {
    if (step.status === "running") {
      const durationMs = now - step.startTime;
      return {
        ...step,
        status: "completed" as const,
        endTime: now,
        durationMs
      };
    }
    return step;
  });

  return {
    ...tracker,
    status: "completed",
    endTime: now,
    totalDurationMs: now - tracker.startTime,
    modelUsed: modelName,
    provider,
    tokenUsage: {
      promptTokens,
      candidateTokens,
      totalTokens,
      estimatedCostUsd: Number(estimatedCost.toFixed(6))
    },
    steps: completedSteps,
    resultingBlog: {
      id: blog.id,
      slug: blog.slug,
      title: blog.title,
      contentLength: blog.content?.length || 0,
      latexFormulaCount: latexCount,
      tags: blog.tags || []
    },
    persistenceStatus: {
      customBlogsJson: true,
      dataTs: true,
      journalJsonl: true,
      firestore: persistenceReport?.firestore ?? false,
      gitHubMirror: persistenceReport?.gitHubMirror ?? false,
      sitemapXml: true
    }
  };
}

/**
 * Marks the pipeline execution record as failed
 */
export function finalizePipelineFailure(
  tracker: PipelineExecutionRecord,
  errorMessage: string
): PipelineExecutionRecord {
  const now = Date.now();
  const completedSteps = tracker.steps.map((step) => {
    if (step.status === "running") {
      return {
        ...step,
        status: "failed" as const,
        endTime: now,
        durationMs: now - step.startTime,
        details: `Failed: ${errorMessage}`
      };
    }
    return step;
  });

  return {
    ...tracker,
    status: "failed",
    endTime: now,
    totalDurationMs: now - tracker.startTime,
    steps: completedSteps,
    error: errorMessage
  };
}
