import test from "node:test";
import assert from "node:assert";
import {
  createProcessLedger,
  startProcessStep,
  completeProcessStep,
  failProcessStep,
  cascadeDownstreamFailures,
  finalizeProcessLedger,
  generateProcessDiagnosticReport,
  executeMonitoredStep
} from "./processTelemetry";

test("createProcessLedger initializes a clean execution context with metadata", () => {
  const ledger = createProcessLedger(
    "proc-101",
    "ArXiv Ingestion & Mathematical Synthesis",
    "admin-user",
    { arxivId: "2608.10001", targetModel: "gemini-2.5-pro" }
  );

  assert.strictEqual(ledger.processId, "proc-101");
  assert.strictEqual(ledger.processName, "ArXiv Ingestion & Mathematical Synthesis");
  assert.strictEqual(ledger.initiator, "admin-user");
  assert.strictEqual(ledger.status, "running");
  assert.strictEqual(ledger.steps.length, 0);
  assert.strictEqual(ledger.completedStepCount, 0);
  assert.strictEqual(ledger.failedStepCount, 0);
  assert.strictEqual(ledger.abortedStepCount, 0);
  assert.strictEqual(ledger.initialPayload.arxivId, "2608.10001");
  assert.ok(ledger.causalChain[0].includes("initialized by admin-user"));
});

test("startProcessStep and completeProcessStep track step duration, snapshots, and timestamps", () => {
  let ledger = createProcessLedger("proc-102", "Search Indexing");

  const { updatedLedger: l1, step } = startProcessStep(
    ledger,
    1,
    "Tokenize Corpus",
    "search_indexing",
    { documentCount: 64 }
  );
  ledger = l1;

  assert.strictEqual(step.stepId, 1);
  assert.strictEqual(step.status, "running");
  assert.strictEqual(step.inputSnapshot.documentCount, 64);

  ledger = completeProcessStep(ledger, 1, { invertedIndexSize: 12500 }, { memoryKb: 450 });

  assert.strictEqual(ledger.completedStepCount, 1);
  assert.strictEqual(ledger.steps[0].status, "completed");
  assert.strictEqual(ledger.steps[0].outputSnapshot.invertedIndexSize, 12500);
  assert.strictEqual(ledger.steps[0].diagnostics?.memoryKb, 450);
  assert.ok(typeof ledger.steps[0].durationMs === "number");
  assert.ok(ledger.causalChain.some((msg) => msg.includes("Step 1 (Tokenize Corpus) COMPLETED")));
});

test("failProcessStep logs error context, error code, stack trace, and root error", () => {
  let ledger = createProcessLedger("proc-103", "LaTeX AST Parsing");

  const { updatedLedger: l1 } = startProcessStep(
    ledger,
    1,
    "Parse Display Equation",
    "math_ast",
    { rawLatex: "$$\\int_0^\\infty e^{-x^2} dx" }
  );
  ledger = l1;

  ledger = failProcessStep(
    ledger,
    1,
    "SyntaxError: Missing closing brace in exponent",
    "ERR_LATEX_AST_SYNTAX",
    "Error at line 1 col 12"
  );

  assert.strictEqual(ledger.status, "failed");
  assert.strictEqual(ledger.failedStepCount, 1);
  assert.strictEqual(ledger.steps[0].status, "failed");
  assert.strictEqual(ledger.steps[0].error?.code, "ERR_LATEX_AST_SYNTAX");
  assert.strictEqual(ledger.steps[0].error?.message, "SyntaxError: Missing closing brace in exponent");
  assert.strictEqual(ledger.steps[0].error?.stack, "Error at line 1 col 12");
  assert.strictEqual(ledger.rootError, "SyntaxError: Missing closing brace in exponent");
  assert.ok(ledger.causalChain.some((msg) => msg.includes("FAILED: [ERR_LATEX_AST_SYNTAX]")));
});

test("startProcessStep automatically aborts downstream steps if an upstream dependency failed", () => {
  let ledger = createProcessLedger("proc-104", "Full Generation Pipeline");

  // Step 1: Ingestion (Fails)
  const { updatedLedger: l1 } = startProcessStep(
    ledger,
    1,
    "Fetch ArXiv Abstract",
    "ingestion",
    { arxivId: "invalid-id-404" }
  );
  ledger = failProcessStep(l1, 1, "HTTP 404: Paper not found on ArXiv", "ERR_ARXIV_NOT_FOUND");

  // Step 2: Prompt Prep (Depends on Step 1)
  const { updatedLedger: l2, step: step2 } = startProcessStep(
    ledger,
    2,
    "Prepare Prompt",
    "ai_inference",
    { promptTemplate: "standard" },
    [1] // Upstream dependency: Step 1
  );
  ledger = l2;

  assert.strictEqual(step2.status, "aborted_due_to_upstream_failure");
  assert.strictEqual(step2.causativeFailure?.failedStepId, 1);
  assert.strictEqual(step2.causativeFailure?.failedStepName, "Fetch ArXiv Abstract");
  assert.strictEqual(step2.causativeFailure?.errorMessage, "HTTP 404: Paper not found on ArXiv");
  assert.strictEqual(ledger.abortedStepCount, 1);
  assert.ok(ledger.causalChain.some((msg) => msg.includes("Step 2 (Prepare Prompt) ABORTED due to upstream failure in Step 1")));
});

test("cascadeDownstreamFailures aborts multiple pending planned steps with causative reason", () => {
  let ledger = createProcessLedger("proc-105", "Ray Tracing Render Pipeline");

  // Plan 3 steps ahead
  ledger.steps = [
    {
      stepId: 1,
      stepName: "Cursor Clamping",
      subsystem: "ray_tracing",
      status: "completed",
      startTime: Date.now() - 100,
      endTime: Date.now() - 50,
      upstreamStepIds: []
    },
    {
      stepId: 2,
      stepName: "Specular Reflection Map",
      subsystem: "ray_tracing",
      status: "failed",
      startTime: Date.now() - 50,
      endTime: Date.now(),
      upstreamStepIds: [1],
      error: { message: "WebGL Context Lost", code: "ERR_WEBGL_LOST", timestamp: Date.now() }
    },
    {
      stepId: 3,
      stepName: "Fresnel Shader Pass",
      subsystem: "ray_tracing",
      status: "pending",
      startTime: Date.now(),
      upstreamStepIds: [2]
    },
    {
      stepId: 4,
      stepName: "Frame Buffer Presentation",
      subsystem: "ray_tracing",
      status: "pending",
      startTime: Date.now(),
      upstreamStepIds: [2, 3]
    }
  ];

  ledger = cascadeDownstreamFailures(ledger, 2, [3, 4]);

  assert.strictEqual(ledger.steps[2].status, "aborted_due_to_upstream_failure");
  assert.strictEqual(ledger.steps[2].causativeFailure?.failedStepId, 2);
  assert.strictEqual(ledger.steps[2].causativeFailure?.errorMessage, "WebGL Context Lost");

  assert.strictEqual(ledger.steps[3].status, "aborted_due_to_upstream_failure");
  assert.strictEqual(ledger.steps[3].causativeFailure?.failedStepId, 2);
});

test("finalizeProcessLedger aggregates counts and sets status to partially_degraded when non-fatal steps fail", () => {
  let ledger = createProcessLedger("proc-106", "Persistence & Sitemap Sync");

  const { updatedLedger: l1 } = startProcessStep(ledger, 1, "Save JSON snapshot", "persistence");
  ledger = completeProcessStep(l1, 1, { path: "/data/snapshot.json" });

  const { updatedLedger: l2 } = startProcessStep(ledger, 2, "Ping Search Engine", "seo_sitemap");
  ledger = failProcessStep(l2, 2, "Timeout 504", "ERR_PING_TIMEOUT");

  ledger = finalizeProcessLedger(ledger, { partialSuccess: true });

  assert.strictEqual(ledger.status, "partially_degraded");
  assert.strictEqual(ledger.completedStepCount, 1);
  assert.strictEqual(ledger.failedStepCount, 1);
  assert.ok(typeof ledger.totalDurationMs === "number");
  assert.strictEqual(ledger.finalResult.partialSuccess, true);
});

test("generateProcessDiagnosticReport extracts complete causal failure analysis", () => {
  let ledger = createProcessLedger("proc-107", "Multi-Phase Pipeline");

  // Step 1: Success
  const { updatedLedger: l1 } = startProcessStep(ledger, 1, "Download Metamaterial Spec", "ingestion", { id: "meta-99" });
  ledger = completeProcessStep(l1, 1, { epsTensor: [[1, 0], [0, -1]] });

  // Step 2: Failed
  const { updatedLedger: l2 } = startProcessStep(ledger, 2, "Numerical Maxwell Solver", "math_ast", {}, [1]);
  ledger = failProcessStep(l2, 2, "Singular Matrix in Helmholtz operator", "ERR_SINGULAR_MATRIX");

  // Step 3: Aborted
  const { updatedLedger: l3 } = startProcessStep(ledger, 3, "Generate SVG Poynting Diagram", "banner_synthesis", {}, [2]);
  ledger = l3;

  const report = generateProcessDiagnosticReport(ledger);

  assert.strictEqual(report.hasErrors, true);
  assert.strictEqual(report.rootCauses.length, 1);
  assert.strictEqual(report.rootCauses[0].stepId, 2);
  assert.strictEqual(report.rootCauses[0].errorCode, "ERR_SINGULAR_MATRIX");
  assert.strictEqual(report.rootCauses[0].errorMessage, "Singular Matrix in Helmholtz operator");

  assert.strictEqual(report.affectedDownstreamSteps.length, 1);
  assert.strictEqual(report.affectedDownstreamSteps[0].stepId, 3);
  assert.strictEqual(report.affectedDownstreamSteps[0].blockedByStepId, 2);

  assert.strictEqual(report.successfulUpstreamContext.length, 1);
  assert.strictEqual(report.successfulUpstreamContext[0].stepId, 1);
  assert.deepStrictEqual(report.successfulUpstreamContext[0].outputSummary, { epsTensor: [[1, 0], [0, -1]] });
});

test("executeMonitoredStep executes synchronous and async steps with full telemetry", async () => {
  const ledgerRef = {
    current: createProcessLedger("proc-108", "Monitored Workflow")
  };

  // Step 1: Synchronous computation
  const res1 = await executeMonitoredStep(
    ledgerRef,
    1,
    "Compute Reading Time",
    "view_analytics",
    [],
    "Word ".repeat(600),
    (input) => {
      const words = input.trim().split(/\s+/).length;
      return `${Math.ceil(words / 200)} min read`;
    }
  );

  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.result, "3 min read");
  assert.strictEqual(ledgerRef.current.completedStepCount, 1);

  // Step 2: Async computation receiving upstream Step 1 output
  const res2 = await executeMonitoredStep(
    ledgerRef,
    2,
    "Format Metadata Block",
    "citation_export",
    [1],
    { title: "Quantum Optics Paper" },
    async (input, upstream) => {
      const readingTime = upstream[1];
      return `${input.title} (${readingTime})`;
    }
  );

  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.result, "Quantum Optics Paper (3 min read)");
  assert.strictEqual(ledgerRef.current.completedStepCount, 2);
});

test("executeMonitoredStep captures exceptions and provides fallback data when configured", async () => {
  const ledgerRef = {
    current: createProcessLedger("proc-109", "Resilient Workflow")
  };

  const res = await executeMonitoredStep(
    ledgerRef,
    1,
    "External Microservice Call",
    "ingestion",
    [],
    { endpoint: "https://api.broken.org" },
    async () => {
      throw new Error("Network connection reset");
    },
    {
      allowFallbackOnFailure: true,
      fallbackValue: { cached: true, data: "cached fallback content" },
      errorCode: "ERR_NETWORK_RESET"
    }
  );

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.result?.cached, true);
  assert.strictEqual(res.result?.data, "cached fallback content");
  assert.strictEqual(ledgerRef.current.failedStepCount, 1);
  assert.strictEqual(ledgerRef.current.steps[0].error?.code, "ERR_NETWORK_RESET");
  assert.strictEqual(ledgerRef.current.steps[0].error?.message, "Network connection reset");
});
