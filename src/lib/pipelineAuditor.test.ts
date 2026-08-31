import test from "node:test";
import assert from "node:assert";
import {
  estimateTokens,
  createPipelineTracker,
  recordStepProgress,
  finalizePipelineSuccess,
  finalizePipelineFailure
} from "./pipelineAuditor";
import { BlogPost } from "../types";

test("estimateTokens calculates proportional token count for English and LaTeX prose", () => {
  assert.strictEqual(estimateTokens(""), 0);
  assert.strictEqual(estimateTokens("hello"), 2);
  const sample = "In integrated dielectric waveguides, Bound States in the Continuum (BICs) arise when destructive interference cancels radiative coupling.";
  const tokens = estimateTokens(sample);
  assert.ok(tokens > 20 && tokens < 50);
});

test("createPipelineTracker initializes pipeline execution tracker with running step 1", () => {
  const tracker = createPipelineTracker(
    "job-101",
    "2608.09854",
    "Towards Optimal Quantum Estimators",
    "Alice Researcher"
  );

  assert.strictEqual(tracker.jobId, "job-101");
  assert.strictEqual(tracker.arxivInput, "2608.09854");
  assert.strictEqual(tracker.paperTitle, "Towards Optimal Quantum Estimators");
  assert.strictEqual(tracker.authors, "Alice Researcher");
  assert.strictEqual(tracker.status, "running");
  assert.strictEqual(tracker.steps.length, 1);
  assert.strictEqual(tracker.steps[0].stepId, 1);
  assert.strictEqual(tracker.steps[0].status, "running");
  assert.strictEqual(tracker.tokenUsage.totalTokens, 0);
  assert.strictEqual(tracker.persistenceStatus.customBlogsJson, false);
});

test("recordStepProgress completes current step and starts subsequent pipeline step", () => {
  const initial = createPipelineTracker("job-102", "2608.01234", "Quantum Computing");
  
  const step2 = recordStepProgress(
    initial,
    1,
    "Gemini 2.5 Pro Mathematical Synthesis",
    "ai_inference",
    "Synthesizing paper equations..."
  );

  assert.strictEqual(step2.steps.length, 2);
  assert.strictEqual(step2.steps[0].stepId, 1);
  assert.strictEqual(step2.steps[0].status, "completed");
  assert.ok(typeof step2.steps[0].durationMs === "number");
  assert.strictEqual(step2.steps[1].stepId, 2);
  assert.strictEqual(step2.steps[1].stepName, "Gemini 2.5 Pro Mathematical Synthesis");
  assert.strictEqual(step2.steps[1].category, "ai_inference");
  assert.strictEqual(step2.steps[1].status, "running");
});

test("finalizePipelineSuccess marks tracker as completed, estimates tokens, costs, and captures metadata", () => {
  const tracker = createPipelineTracker("job-103", "2608.03301", "Topological Nanophotonics");
  
  const sampleBlog: BlogPost = {
    id: "topological-slr-3301",
    slug: "topological-valley-polarized-surface-lattice-resonances",
    title: "Topological Valley Polarized Surface Lattice Resonances",
    author: "Elena Vance",
    date: "2026-08-30",
    readingTime: "8 min read",
    bannerSvg: "<svg></svg>",
    arxivLink: "https://arxiv.org/abs/2608.03301",
    excerpt: "Valley polarization in metasurfaces",
    content: "## Formulas\n$$\\mathcal{C}_v = \\pm \\frac{1}{2}$$\nInline $\\omega = ck$ relation.",
    tags: ["Nanophotonics", "Topology"]
  };

  const promptText = "Generate research paper on topological nanophotonics";
  const responseText = "Here is the full synthesized publication with math derivations";

  const finalized = finalizePipelineSuccess(
    tracker,
    sampleBlog,
    "gemini-2.5-pro",
    "gemini",
    promptText,
    responseText,
    { firestore: true, gitHubMirror: true }
  );

  assert.strictEqual(finalized.status, "completed");
  assert.strictEqual(finalized.modelUsed, "gemini-2.5-pro");
  assert.strictEqual(finalized.provider, "gemini");
  assert.ok(finalized.tokenUsage.promptTokens > 0);
  assert.ok(finalized.tokenUsage.candidateTokens > 0);
  assert.ok(finalized.tokenUsage.totalTokens > 0);
  assert.ok(finalized.tokenUsage.estimatedCostUsd >= 0);
  assert.strictEqual(finalized.resultingBlog?.id, sampleBlog.id);
  assert.strictEqual(finalized.resultingBlog?.latexFormulaCount, 2);
  assert.strictEqual(finalized.persistenceStatus.firestore, true);
  assert.strictEqual(finalized.persistenceStatus.gitHubMirror, true);
  assert.strictEqual(finalized.persistenceStatus.sitemapXml, true);
});

test("finalizePipelineFailure marks tracker and active step as failed with error details", () => {
  const tracker = createPipelineTracker("job-104", "invalid-id", "Failed Paper");
  const failed = finalizePipelineFailure(tracker, "ArXiv ID not found on server");

  assert.strictEqual(failed.status, "failed");
  assert.strictEqual(failed.error, "ArXiv ID not found on server");
  assert.strictEqual(failed.steps[0].status, "failed");
  assert.ok(failed.steps[0].details?.includes("Failed: ArXiv ID not found on server"));
});
