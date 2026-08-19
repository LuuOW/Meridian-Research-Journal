import test from "node:test";
import assert from "node:assert";
import {
  PIPELINE_STEPS,
  createGenerationJob,
  calculateJobProgressPercentage,
  advanceJobStep,
  completeJob,
  failJob,
  filterActiveJobs,
  countRunningJobs
} from "./pipelineUtils.js";
import { BlogPost } from "../types.js";

const mockPost: BlogPost = {
  id: "test-blog-123",
  title: "Topological Photonic Modes in Synthetic Dimensions",
  slug: "topological-photonic-modes",
  excerpt: "Non-trivial Chern invariants in 4D synthetic optical lattices.",
  content: "Synthetic space enables exploration of higher-dimensional topological physics.",
  author: "Lucas Kempe",
  date: "2026-08-18T12:00:00Z",
  readingTime: "5 min read",
  arxivLink: "https://arxiv.org/abs/2608.16857",
  tags: ["Photonics", "Topology"],
  bannerSvg: "<svg></svg>"
};

test("createGenerationJob initializes a job in generating state with first pipeline step", () => {
  const job = createGenerationJob("https://arxiv.org/abs/2608.16857");

  assert.ok(job.id.startsWith("job-"));
  assert.strictEqual(job.arxivInput, "https://arxiv.org/abs/2608.16857");
  assert.strictEqual(job.status, "generating");
  assert.strictEqual(job.currentStepIndex, 0);
  assert.strictEqual(job.currentStepMessage, PIPELINE_STEPS[0]);
  assert.strictEqual(job.progressPercent, 15);
  assert.strictEqual(job.dismissed, false);
});

test("calculateJobProgressPercentage scales monotonically up to 92 percent", () => {
  assert.strictEqual(calculateJobProgressPercentage(-1), 0);
  assert.strictEqual(calculateJobProgressPercentage(0, 5), 30);
  assert.strictEqual(calculateJobProgressPercentage(2, 5), 60);
  assert.strictEqual(calculateJobProgressPercentage(4, 5), 90);
  assert.strictEqual(calculateJobProgressPercentage(10, 5), 90);
});

test("advanceJobStep advances current step and updates progress", () => {
  const initial = createGenerationJob("2608.16857");
  const step1 = advanceJobStep(initial);

  assert.strictEqual(step1.currentStepIndex, 1);
  assert.strictEqual(step1.currentStepMessage, PIPELINE_STEPS[1]);
  assert.ok(step1.progressPercent > initial.progressPercent);

  // Completed jobs are not advanced
  const completed = completeJob(step1, mockPost);
  const attemptedAdvance = advanceJobStep(completed);
  assert.strictEqual(attemptedAdvance.status, "completed");
  assert.strictEqual(attemptedAdvance.progressPercent, 100);
});

test("completeJob transitions status to completed with 100% progress and attached post", () => {
  const job = createGenerationJob("2608.16857");
  const completed = completeJob(job, mockPost);

  assert.strictEqual(completed.status, "completed");
  assert.strictEqual(completed.progressPercent, 100);
  assert.strictEqual(completed.resultBlog?.id, mockPost.id);
  assert.ok(completed.completedTime !== undefined);
});

test("failJob transitions status to failed and records error message", () => {
  const job = createGenerationJob("invalid-link");
  const failed = failJob(job, "arXiv API rate limit exceeded");

  assert.strictEqual(failed.status, "failed");
  assert.strictEqual(failed.error, "arXiv API rate limit exceeded");
  assert.ok(failed.completedTime !== undefined);
});

test("filterActiveJobs and countRunningJobs correctly handle dismissed and active jobs", () => {
  const j1 = createGenerationJob("link1");
  const j2 = createGenerationJob("link2");
  const j3 = createGenerationJob("link3");
  j3.dismissed = true;
  const j4 = completeJob(createGenerationJob("link4"), mockPost);

  const active = filterActiveJobs([j1, j2, j3, j4]);
  assert.strictEqual(active.length, 3);
  assert.strictEqual(countRunningJobs([j1, j2, j3, j4]), 2);
});
