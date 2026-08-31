import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import {
  appendGenerationJournal,
  readPipelineRecords,
  createBlogSnapshot,
  readCustomBlogs
} from "./persistenceManager";
import { PipelineExecutionRecord, BlogPost } from "../types";

const mockRecord: PipelineExecutionRecord = {
  jobId: `test-job-${Date.now()}`,
  triggerId: Date.now(),
  arxivInput: "2608.99999",
  paperTitle: "Quantum Simulation in Metamaterials",
  authors: "Lucas Kempe",
  status: "completed",
  startTime: Date.now() - 5000,
  endTime: Date.now(),
  totalDurationMs: 5000,
  modelUsed: "gemini-2.5-pro",
  provider: "gemini",
  tokenUsage: {
    promptTokens: 500,
    candidateTokens: 1200,
    totalTokens: 1700,
    estimatedCostUsd: 0.000397
  },
  steps: [
    {
      stepId: 1,
      stepName: "Input Validation & ArXiv ID Parsing",
      category: "ingestion",
      status: "completed",
      startTime: Date.now() - 5000,
      endTime: Date.now() - 4000,
      durationMs: 1000
    }
  ],
  persistenceStatus: {
    customBlogsJson: true,
    dataTs: true,
    journalJsonl: true,
    firestore: false,
    gitHubMirror: false,
    sitemapXml: true
  }
};

const mockBlogs: BlogPost[] = [
  {
    id: "test-snapshot-blog-1",
    title: "Quantum State Simulation",
    slug: "quantum-state-simulation",
    excerpt: "Simulation of open quantum systems.",
    content: "Content with LaTeX $$\\hat{H}\\psi = E\\psi$$",
    author: "Lucas Kempe",
    date: "2026-08-30",
    readingTime: "7 min read",
    bannerSvg: "<svg></svg>",
    arxivLink: "https://arxiv.org/abs/2608.99999",
    tags: ["Quantum", "Simulation"]
  }
];

test("appendGenerationJournal appends record to journal and updates pipeline_records.json", () => {
  const success = appendGenerationJournal(mockRecord);
  assert.strictEqual(success, true);

  const records = readPipelineRecords();
  assert.ok(records.length > 0);
  const found = records.find(r => r.jobId === mockRecord.jobId);
  assert.ok(found, "Appended record should be present in readPipelineRecords");
  assert.strictEqual(found?.arxivInput, mockRecord.arxivInput);
});

test("createBlogSnapshot creates timestamped snapshot file on disk", () => {
  const snapshotPath = createBlogSnapshot(mockBlogs);
  assert.ok(snapshotPath, "Snapshot path must be returned");
  assert.ok(fs.existsSync(snapshotPath));

  const data = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  assert.strictEqual(data.length, 1);
  assert.strictEqual(data[0].id, "test-snapshot-blog-1");
});

test("readCustomBlogs returns array of blog posts from filesystem", () => {
  const blogs = readCustomBlogs();
  assert.ok(Array.isArray(blogs));
  if (blogs.length > 0) {
    assert.ok(typeof blogs[0].id === "string");
    assert.ok(typeof blogs[0].title === "string");
  }
});
