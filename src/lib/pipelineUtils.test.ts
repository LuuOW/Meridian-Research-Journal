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

test("filterActiveJobs and countRunningJobs filter dismissed and count active correctly", () => {
  const j1 = createGenerationJob("2303.02517");
  const j2 = createGenerationJob("2401.08765");
  j2.dismissed = true;

  const active = filterActiveJobs([j1, j2]);
  assert.strictEqual(active.length, 1);
  assert.strictEqual(active[0].id, j1.id);

  assert.strictEqual(countRunningJobs([j1, j2]), 1);
});
