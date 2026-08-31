/**
 * Unified Process & Algorithm Execution Telemetry Engine
 * 
 * Provides end-to-end logging, state preservation, causal chain tracking,
 * and failure propagation across all computational processes and algorithms
 * inside the blog application.
 */

export type SubsystemCategory =
  | "ingestion"
  | "math_ast"
  | "ai_inference"
  | "banner_synthesis"
  | "search_indexing"
  | "ray_tracing"
  | "passkey_security"
  | "citation_export"
  | "persistence"
  | "seo_sitemap"
  | "view_analytics";

export type StepExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "aborted_due_to_upstream_failure"
  | "skipped";

export interface ProcessStepLog<TInput = any, TOutput = any> {
  stepId: number;
  stepName: string;
  subsystem: SubsystemCategory;
  status: StepExecutionStatus;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  inputSnapshot?: TInput;
  outputSnapshot?: TOutput;
  upstreamStepIds: number[];
  error?: {
    message: string;
    code?: string;
    stack?: string;
    timestamp: number;
  };
  causativeFailure?: {
    failedStepId: number;
    failedStepName: string;
    errorMessage: string;
  };
  diagnostics?: Record<string, any>;
}

export interface ProcessExecutionContext {
  processId: string;
  processName: string;
  initiator: string;
  status: "running" | "completed" | "failed" | "partially_degraded";
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
  initialPayload?: any;
  finalResult?: any;
  rootError?: string;
  failedStepCount: number;
  completedStepCount: number;
  abortedStepCount: number;
  steps: ProcessStepLog[];
  causalChain: string[];
}

/**
 * Creates a new process execution ledger for a multi-step computation or algorithm
 */
export function createProcessLedger(
  processId: string,
  processName: string,
  initiator: string = "system",
  initialPayload?: any
): ProcessExecutionContext {
  const now = Date.now();
  return {
    processId,
    processName,
    initiator,
    status: "running",
    startTime: now,
    initialPayload: initialPayload ? JSON.parse(JSON.stringify(initialPayload)) : undefined,
    failedStepCount: 0,
    completedStepCount: 0,
    abortedStepCount: 0,
    steps: [],
    causalChain: [`[${new Date(now).toISOString()}] Process '${processName}' initialized by ${initiator}`]
  };
}

/**
 * Registers and starts a new step within the process execution ledger
 */
export function startProcessStep<TInput = any>(
  ledger: ProcessExecutionContext,
  stepId: number,
  stepName: string,
  subsystem: SubsystemCategory,
  inputSnapshot?: TInput,
  upstreamStepIds: number[] = []
): { updatedLedger: ProcessExecutionContext; step: ProcessStepLog<TInput> } {
  const now = Date.now();

  // Check if any upstream step failed
  const failedUpstream = ledger.steps.find(
    (s) => upstreamStepIds.includes(s.stepId) && s.status === "failed"
  );

  const step: ProcessStepLog<TInput> = {
    stepId,
    stepName,
    subsystem,
    status: failedUpstream ? "aborted_due_to_upstream_failure" : "running",
    startTime: now,
    inputSnapshot: inputSnapshot ? JSON.parse(JSON.stringify(inputSnapshot)) : undefined,
    upstreamStepIds,
    causativeFailure: failedUpstream
      ? {
          failedStepId: failedUpstream.stepId,
          failedStepName: failedUpstream.stepName,
          errorMessage: failedUpstream.error?.message || "Unknown upstream error"
        }
      : undefined
  };

  const updatedSteps = [...ledger.steps, step];
  const abortedIncrement = failedUpstream ? 1 : 0;

  const logMessage = failedUpstream
    ? `[${new Date(now).toISOString()}] Step ${stepId} (${stepName}) ABORTED due to upstream failure in Step ${failedUpstream.stepId} (${failedUpstream.stepName})`
    : `[${new Date(now).toISOString()}] Step ${stepId} (${stepName}) STARTED under subsystem '${subsystem}'`;

  const updatedLedger: ProcessExecutionContext = {
    ...ledger,
    steps: updatedSteps,
    abortedStepCount: ledger.abortedStepCount + abortedIncrement,
    causalChain: [...ledger.causalChain, logMessage]
  };

  return { updatedLedger, step };
}

/**
 * Completes a running step with verified output data and diagnostic metrics
 */
export function completeProcessStep<TOutput = any>(
  ledger: ProcessExecutionContext,
  stepId: number,
  outputSnapshot?: TOutput,
  diagnostics?: Record<string, any>
): ProcessExecutionContext {
  const now = Date.now();
  let stepFound = false;

  const updatedSteps = ledger.steps.map((step) => {
    if (step.stepId === stepId) {
      stepFound = true;
      const durationMs = now - step.startTime;
      return {
        ...step,
        status: "completed" as const,
        endTime: now,
        durationMs,
        outputSnapshot: outputSnapshot ? JSON.parse(JSON.stringify(outputSnapshot)) : undefined,
        diagnostics: diagnostics || step.diagnostics
      };
    }
    return step;
  });

  if (!stepFound) {
    throw new Error(`Step with ID ${stepId} was not found in process ledger '${ledger.processId}'`);
  }

  const stepName = ledger.steps.find((s) => s.stepId === stepId)?.stepName || `Step ${stepId}`;
  const logMessage = `[${new Date(now).toISOString()}] Step ${stepId} (${stepName}) COMPLETED in ${now - (ledger.steps.find((s) => s.stepId === stepId)?.startTime || now)}ms`;

  return {
    ...ledger,
    steps: updatedSteps,
    completedStepCount: ledger.completedStepCount + 1,
    causalChain: [...ledger.causalChain, logMessage]
  };
}

/**
 * Records a failure in a specific step and prepares downstream failure cascade
 */
export function failProcessStep(
  ledger: ProcessExecutionContext,
  stepId: number,
  errorMessage: string,
  errorCode: string = "ERR_ALGORITHM_EXECUTION",
  errorStack?: string
): ProcessExecutionContext {
  const now = Date.now();
  let targetStepName = `Step ${stepId}`;

  const updatedSteps = ledger.steps.map((step) => {
    if (step.stepId === stepId) {
      targetStepName = step.stepName;
      const durationMs = now - step.startTime;
      return {
        ...step,
        status: "failed" as const,
        endTime: now,
        durationMs,
        error: {
          message: errorMessage,
          code: errorCode,
          stack: errorStack,
          timestamp: now
        }
      };
    }
    return step;
  });

  const logMessage = `[${new Date(now).toISOString()}] Step ${stepId} (${targetStepName}) FAILED: [${errorCode}] ${errorMessage}`;

  return {
    ...ledger,
    status: "failed",
    rootError: errorMessage,
    failedStepCount: ledger.failedStepCount + 1,
    steps: updatedSteps,
    causalChain: [...ledger.causalChain, logMessage]
  };
}

/**
 * Propagates failure to pending/planned subsequent steps that depended on the failed step
 */
export function cascadeDownstreamFailures(
  ledger: ProcessExecutionContext,
  failedStepId: number,
  dependentStepIds: number[]
): ProcessExecutionContext {
  const now = Date.now();
  const failedStep = ledger.steps.find((s) => s.stepId === failedStepId);
  const failureReason = failedStep?.error?.message || "Upstream process failure";

  const updatedSteps = ledger.steps.map((step) => {
    if (dependentStepIds.includes(step.stepId) && step.status === "pending") {
      return {
        ...step,
        status: "aborted_due_to_upstream_failure" as const,
        endTime: now,
        durationMs: 0,
        causativeFailure: {
          failedStepId,
          failedStepName: failedStep?.stepName || `Step ${failedStepId}`,
          errorMessage: failureReason
        }
      };
    }
    return step;
  });

  return {
    ...ledger,
    steps: updatedSteps,
    abortedStepCount: ledger.abortedStepCount + dependentStepIds.length
  };
}

/**
 * Finalizes the complete process execution ledger
 */
export function finalizeProcessLedger<TFinal = any>(
  ledger: ProcessExecutionContext,
  finalResult?: TFinal
): ProcessExecutionContext {
  const now = Date.now();
  const totalDurationMs = now - ledger.startTime;

  let finalStatus: ProcessExecutionContext["status"] = "completed";
  if (ledger.failedStepCount > 0) {
    finalStatus = ledger.completedStepCount > 0 ? "partially_degraded" : "failed";
  }

  const logMessage = `[${new Date(now).toISOString()}] Process '${ledger.processName}' finalized with status '${finalStatus}' in ${totalDurationMs}ms (Completed: ${ledger.completedStepCount}, Failed: ${ledger.failedStepCount}, Aborted: ${ledger.abortedStepCount})`;

  return {
    ...ledger,
    status: finalStatus,
    endTime: now,
    totalDurationMs,
    finalResult: finalResult ? JSON.parse(JSON.stringify(finalResult)) : undefined,
    causalChain: [...ledger.causalChain, logMessage]
  };
}

/**
 * Extracts a complete diagnostic failure report with causal lineage
 */
export function generateProcessDiagnosticReport(ledger: ProcessExecutionContext): {
  processId: string;
  processName: string;
  hasErrors: boolean;
  rootCauses: Array<{
    stepId: number;
    stepName: string;
    subsystem: SubsystemCategory;
    errorCode: string;
    errorMessage: string;
  }>;
  affectedDownstreamSteps: Array<{
    stepId: number;
    stepName: string;
    blockedByStepId: number;
  }>;
  successfulUpstreamContext: Array<{
    stepId: number;
    stepName: string;
    outputSummary: any;
  }>;
  timelineLogs: string[];
} {
  const rootCauses = ledger.steps
    .filter((s) => s.status === "failed")
    .map((s) => ({
      stepId: s.stepId,
      stepName: s.stepName,
      subsystem: s.subsystem,
      errorCode: s.error?.code || "ERR_UNKNOWN",
      errorMessage: s.error?.message || "Unknown error"
    }));

  const affectedDownstreamSteps = ledger.steps
    .filter((s) => s.status === "aborted_due_to_upstream_failure" && s.causativeFailure)
    .map((s) => ({
      stepId: s.stepId,
      stepName: s.stepName,
      blockedByStepId: s.causativeFailure!.failedStepId
    }));

  const successfulUpstreamContext = ledger.steps
    .filter((s) => s.status === "completed")
    .map((s) => ({
      stepId: s.stepId,
      stepName: s.stepName,
      outputSummary: s.outputSnapshot
    }));

  return {
    processId: ledger.processId,
    processName: ledger.processName,
    hasErrors: rootCauses.length > 0 || affectedDownstreamSteps.length > 0,
    rootCauses,
    affectedDownstreamSteps,
    successfulUpstreamContext,
    timelineLogs: ledger.causalChain
  };
}

/**
 * Safe Monitored Step Executor:
 * Executes an algorithmic function, intercepts runtime errors, logs the full
 * input/output snapshots, and updates the process ledger with bidirectional causality.
 */
export async function executeMonitoredStep<TIn, TOut>(
  ledgerRef: { current: ProcessExecutionContext },
  stepId: number,
  stepName: string,
  subsystem: SubsystemCategory,
  upstreamStepIds: number[],
  input: TIn,
  stepFn: (input: TIn, upstreamOutputs: Record<number, any>) => Promise<TOut> | TOut,
  options?: {
    allowFallbackOnFailure?: boolean;
    fallbackValue?: TOut;
    errorCode?: string;
  }
): Promise<{ success: boolean; result?: TOut; error?: Error }> {
  // Start step
  const { updatedLedger, step } = startProcessStep(
    ledgerRef.current,
    stepId,
    stepName,
    subsystem,
    input,
    upstreamStepIds
  );
  ledgerRef.current = updatedLedger;

  // Check if step was already aborted due to upstream failure
  if (step.status === "aborted_due_to_upstream_failure") {
    return {
      success: false,
      error: new Error(`Step ${stepId} (${stepName}) aborted: upstream failure in Step ${step.causativeFailure?.failedStepId}`)
    };
  }

  // Gather upstream step outputs
  const upstreamOutputs: Record<number, any> = {};
  for (const prevStep of ledgerRef.current.steps) {
    if (upstreamStepIds.includes(prevStep.stepId) && prevStep.outputSnapshot !== undefined) {
      upstreamOutputs[prevStep.stepId] = prevStep.outputSnapshot;
    }
  }

  try {
    const result = await Promise.resolve(stepFn(input, upstreamOutputs));
    ledgerRef.current = completeProcessStep(ledgerRef.current, stepId, result);
    return { success: true, result };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    const errorCode = options?.errorCode || "ERR_STEP_EXECUTION_FAILURE";
    const errorStack = err?.stack;

    ledgerRef.current = failProcessStep(
      ledgerRef.current,
      stepId,
      errorMsg,
      errorCode,
      errorStack
    );

    if (options?.allowFallbackOnFailure && options.fallbackValue !== undefined) {
      return {
        success: false,
        result: options.fallbackValue,
        error: err instanceof Error ? err : new Error(errorMsg)
      };
    }

    return {
      success: false,
      error: err instanceof Error ? err : new Error(errorMsg)
    };
  }
}
