import { GenerationJob, BlogPost, JobStepLog } from "../types";

export const PIPELINE_STEPS = [
  "Contacting arXiv open archives export server...",
  "Retrieving paper abstract & metadata...",
  "Analyzing scientific concepts & equations...",
  "Gemini generating editorial prose...",
  "Finalizing publication-ready Markdown & SVG..."
];

export const BANNER_PIPELINE_STEPS = [
  "Analyzing publication science themes & typography...",
  "Formulating glowing vector geometric structures...",
  "Gemini synthesizing responsive animated SVG vector...",
  "Validating SVG structure & synchronizing publication..."
];

export const ARTICLE_REGEN_PIPELINE_STEPS = [
  "Contacting arXiv & extracting source literature...",
  "Formulating rigorous mathematical models & LaTeX proofs...",
  "Gemini generating comprehensive scholarly prose...",
  "Validating physics consistency & updating publication..."
];

const STORAGE_KEY = "meridian_generation_pipeline_jobs";

export function loadStoredJobs(): GenerationJob[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const now = Date.now();
      return parsed
        .filter(j => j && typeof j === "object" && j.id)
        .map(j => {
          // If a job was left in "generating" state from a previous browser session, resolve it so it doesn't spin indefinitely
          if (j.status === "generating" && (now - (j.startTime || 0) > 3 * 60 * 1000)) {
            return {
              ...j,
              status: "failed",
              currentStepMessage: "Session interrupted during generation",
              error: "Process timed out or page was reloaded during generation.",
              completedTime: now
            };
          }
          return j;
        });
    }
  } catch (err) {
    console.warn("Failed to load stored generation jobs:", err);
  }
  return [];
}

export function saveStoredJobs(jobs: GenerationJob[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    // Retain up to 40 most recent jobs to prevent unbounded storage growth
    const trimmed = jobs.slice(0, 40);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("Failed to persist generation jobs:", err);
  }
}

export function createGenerationJob(arxivInput: string): GenerationJob {
  const cleanInput = arxivInput.trim();
  const id = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  return {
    id,
    jobType: "article",
    arxivInput: cleanInput,
    targetTitle: cleanInput.startsWith("http") ? "arXiv Research Paper" : `arXiv:${cleanInput}`,
    status: "generating",
    currentStepIndex: 0,
    currentStepMessage: PIPELINE_STEPS[0],
    progressPercent: 15,
    startTime: now,
    dismissed: false,
    stepLogs: [
      { timestamp: now, message: `Pipeline initiated for ${cleanInput}` },
      { timestamp: now, message: PIPELINE_STEPS[0] }
    ]
  };
}

export function createBannerGenerationJob(blog: BlogPost): GenerationJob {
  const id = `job-banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  return {
    id,
    jobType: "banner_regen",
    arxivInput: blog.arxivLink || blog.slug || blog.id,
    targetTitle: blog.title || "Publication Banner",
    status: "generating",
    currentStepIndex: 0,
    currentStepMessage: BANNER_PIPELINE_STEPS[0],
    progressPercent: 20,
    startTime: now,
    dismissed: false,
    stepLogs: [
      { timestamp: now, message: `Banner regeneration initiated for "${blog.title}"` },
      { timestamp: now, message: BANNER_PIPELINE_STEPS[0] }
    ]
  };
}

export function createArticleRegenerationJob(blog: BlogPost): GenerationJob {
  const id = `job-article-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  return {
    id,
    jobType: "article_regen",
    arxivInput: blog.arxivLink || blog.slug || blog.id,
    targetTitle: blog.title || "Research Publication",
    status: "generating",
    currentStepIndex: 0,
    currentStepMessage: ARTICLE_REGEN_PIPELINE_STEPS[0],
    progressPercent: 20,
    startTime: now,
    dismissed: false,
    stepLogs: [
      { timestamp: now, message: `Article regeneration initiated for "${blog.title}"` },
      { timestamp: now, message: ARTICLE_REGEN_PIPELINE_STEPS[0] }
    ]
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
  const steps = job.jobType === "banner_regen"
    ? BANNER_PIPELINE_STEPS
    : job.jobType === "article_regen"
    ? ARTICLE_REGEN_PIPELINE_STEPS
    : PIPELINE_STEPS;
  const nextStepIdx = (job.currentStepIndex + 1) % steps.length;
  const nextMsg = steps[nextStepIdx];
  const now = Date.now();

  const prevLogs = job.stepLogs || [];
  const updatedLogs = [...prevLogs, { timestamp: now, message: nextMsg }];

  return {
    ...job,
    currentStepIndex: nextStepIdx,
    currentStepMessage: nextMsg,
    progressPercent: calculateJobProgressPercentage(nextStepIdx, steps.length),
    stepLogs: updatedLogs.slice(-15) // Keep last 15 log steps
  };
}

export function completeJob(job: GenerationJob, blog: BlogPost): GenerationJob {
  const now = Date.now();
  const prevLogs = job.stepLogs || [];
  const finishMsg = job.jobType === "banner_regen"
    ? `Banner SVG synthesized and applied to "${blog.title}"`
    : job.jobType === "article_regen"
    ? `Article "${blog.title}" regenerated & published!`
    : `Article "${blog.title}" generated & published!`;

  return {
    ...job,
    status: "completed",
    progressPercent: 100,
    currentStepMessage: finishMsg,
    completedTime: now,
    resultBlog: blog,
    targetTitle: blog.title || job.targetTitle,
    stepLogs: [...prevLogs, { timestamp: now, message: finishMsg }].slice(-15)
  };
}

export function failJob(job: GenerationJob, errorMsg: string): GenerationJob {
  const now = Date.now();
  const prevLogs = job.stepLogs || [];
  const msg = errorMsg || "Failed to generate blog post.";

  return {
    ...job,
    status: "failed",
    currentStepMessage: "Pipeline error encountered",
    error: msg,
    completedTime: now,
    stepLogs: [...prevLogs, { timestamp: now, message: `Error: ${msg}` }].slice(-15)
  };
}

export function formatElapsedTime(startTimeMs: number, completedTimeMs?: number): string {
  const end = completedTimeMs || Date.now();
  const totalSeconds = Math.max(0, Math.floor((end - startTimeMs) / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function filterActiveJobs(jobs: GenerationJob[]): GenerationJob[] {
  return jobs.filter((j) => !j.dismissed);
}

export function countRunningJobs(jobs: GenerationJob[]): number {
  return jobs.filter((j) => !j.dismissed && j.status === "generating").length;
}
