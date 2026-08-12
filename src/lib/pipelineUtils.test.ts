import test from "node:test";
import assert from "node:assert";
import {
  createGenerationJob,
  calculateJobProgressPercentage,
  advanceJobStep,
  completeJob,
  failJob,
  filterActiveJobs,
  countRunningJobs,
  PIPELINE_STEPS
} from "./pipelineUtils";
import { BlogPost } from "../types";

test("createGenerationJob creates a valid generating job", () => {
  const job = createGenerationJob(" 2303.02517 ");
  assert.strictEqual(job.arxivInput, "2303.02517");
  assert.strictEqual(job.status, "generating");
  assert.strictEqual(job.currentStepIndex, 0);
  assert.strictEqual(job.currentStepMessage, PIPELINE_STEPS[0]);
  assert.ok(job.progressPercent > 0);
  assert.strictEqual(job.dismissed, false);
});

test("calculateJobProgressPercentage calculates correct progress", () => {
  assert.strictEqual(calculateJobProgressPercentage(0), 30);
  assert.strictEqual(calculateJobProgressPercentage(2), 60);
  assert.strictEqual(calculateJobProgressPercentage(4), 90);
});

test("advanceJobStep advances job step correctly", () => {
  const job = createGenerationJob("2303.02517");
  const advanced = advanceJobStep(job);
  assert.strictEqual(advanced.currentStepIndex, 1);
  assert.strictEqual(advanced.currentStepMessage, PIPELINE_STEPS[1]);
  assert.ok(advanced.progressPercent > job.progressPercent);
});

test("completeJob marks job completed and attaches blog", () => {
  const job = createGenerationJob("2303.02517");
  const mockBlog: BlogPost = {
    id: "generated-123",
    title: "Quantum Test",
    slug: "quantum-test",
    excerpt: "Excerpt",
    content: "Content",
    date: "2025",
    readingTime: "5 min read",
    arxivLink: "https://arxiv.org",
    bannerSvg: "<svg></svg>",
    author: "Test Author",
    tags: ["Quantum"]
  };

  const completed = completeJob(job, mockBlog);
  assert.strictEqual(completed.status, "completed");
  assert.strictEqual(completed.progressPercent, 100);
  assert.deepStrictEqual(completed.resultBlog, mockBlog);
  assert.ok(completed.completedTime);
});

test("failJob marks job failed and attaches error message", () => {
  const job = createGenerationJob("2303.02517");
  const failed = failJob(job, "Server timeout");
  assert.strictEqual(failed.status, "failed");
  assert.strictEqual(failed.error, "Server timeout");
  assert.ok(failed.completedTime);
});

test("calculateJobProgressPercentage handles out-of-bounds step indices", () => {
  assert.strictEqual(calculateJobProgressPercentage(-1), 0);
  assert.strictEqual(calculateJobProgressPercentage(10), 90);
  assert.strictEqual(calculateJobProgressPercentage(100), 90);
});

test("advanceJobStep wraps around PIPELINE_STEPS and ignores completed or failed jobs", () => {
  let job = createGenerationJob("2303.02517");
  // Advance through all steps
  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    job = advanceJobStep(job);
  }
  // After PIPELINE_STEPS.length steps, currentStepIndex should wrap to 0
  assert.strictEqual(job.currentStepIndex, 0);

  // Completed job should not advance
  const mockBlog: BlogPost = {
    id: "g1",
    title: "T",
    slug: "t",
    excerpt: "e",
    content: "c",
    date: "2026",
    readingTime: "1 min",
    arxivLink: "link",
    bannerSvg: "<svg></svg>",
    author: "A",
    tags: []
  };
  const completed = completeJob(job, mockBlog);
  const attemptedAdvance = advanceJobStep(completed);
  assert.strictEqual(attemptedAdvance.status, "completed");
  assert.strictEqual(attemptedAdvance.currentStepIndex, 0);
});

test("failJob uses fallback error message when error string is empty", () => {
  const job = createGenerationJob("2303.02517");
  const failed = failJob(job, "");
  assert.strictEqual(failed.status, "failed");
  assert.strictEqual(failed.error, "Failed to generate blog post.");
});

test("filterActiveJobs and countRunningJobs handle empty and multi-job arrays", () => {
  assert.deepStrictEqual(filterActiveJobs([]), []);
  assert.strictEqual(countRunningJobs([]), 0);

  const j1 = createGenerationJob("1111.1111");
  const j2 = createGenerationJob("2222.2222");
  const j3 = failJob(createGenerationJob("3333.3333"), "Failed");

  assert.strictEqual(countRunningJobs([j1, j2, j3]), 2);
});

