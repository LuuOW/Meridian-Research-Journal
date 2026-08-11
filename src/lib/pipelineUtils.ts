import { GenerationJob, BlogPost } from "../types";

export const PIPELINE_STEPS = [
  "Contacting arXiv open archives export server...",
  "Retrieving paper abstract & metadata...",
  "Analyzing scientific concepts & equations...",
  "Gemini generating editorial prose...",
  "Finalizing publication-ready Markdown & SVG..."
];

export function createGenerationJob(arxivInput: string): GenerationJob {
  const cleanInput = arxivInput.trim();
  const id = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    arxivInput: cleanInput,
    status: "generating",
    currentStepIndex: 0,
    currentStepMessage: PIPELINE_STEPS[0],
    progressPercent: 15,
    startTime: Date.now(),
    dismissed: false
  };
}

export function calculateJobProgressPercentage(stepIndex: number, totalSteps: number = PIPELINE_STEPS.length): number {
  if (stepIndex < 0) return 0;
  if (stepIndex >= totalSteps) return 90; // Reserving 100% for completed state
  const stepRatio = (stepIndex + 1) / totalSteps;
  return Math.min(92, Math.round(15 + stepRatio * 75));
}

export function advanceJobStep(job: GenerationJob): GenerationJob {
  if (job.status !== "generating") return job;
  const nextStepIdx = (job.currentStepIndex + 1) % PIPELINE_STEPS.length;
  return {
    ...job,
    currentStepIndex: nextStepIdx,
    currentStepMessage: PIPELINE_STEPS[nextStepIdx],
    progressPercent: calculateJobProgressPercentage(nextStepIdx)
  };
}

export function completeJob(job: GenerationJob, blog: BlogPost): GenerationJob {
  return {
    ...job,
    status: "completed",
    progressPercent: 100,
    currentStepMessage: "Article generation complete & published!",
    completedTime: Date.now(),
    resultBlog: blog
  };
}

export function failJob(job: GenerationJob, errorMsg: string): GenerationJob {
  return {
    ...job,
    status: "failed",
    currentStepMessage: "Pipeline error encountered",
    error: errorMsg || "Failed to generate blog post.",
    completedTime: Date.now()
  };
}

export function filterActiveJobs(jobs: GenerationJob[]): GenerationJob[] {
  return jobs.filter((j) => !j.dismissed);
}

export function countRunningJobs(jobs: GenerationJob[]): number {
  return jobs.filter((j) => !j.dismissed && j.status === "generating").length;
}
