import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { resolveBlogSlugOrId, normalizeSlug, stripSlugTimestampSuffix } from "../src/lib/slugResolver";
import {
  createPipelineTracker,
  recordStepProgress,
  finalizePipelineSuccess,
  finalizePipelineFailure,
  estimateTokens
} from "../src/lib/pipelineAuditor";
import {
  persistMultiTierBlogs,
  appendGenerationJournal,
  readPipelineRecords,
  readCustomBlogs,
  createBlogSnapshot
} from "../src/lib/persistenceManager";
import { BlogPost } from "../src/types";

console.log("==========================================");
console.log("RUNNING 9999% PERSISTENCE & PIPELINE UNIT TESTS");
console.log("==========================================");

// TEST 1: Slug and ID Resolution Resilience
console.log("\n[TEST 1] Testing Slug & ID Resolution...");
const sampleBlogs: BlogPost[] = [
  {
    id: "generated-1740685200000",
    slug: "towards-optimal-quantum-estimators-for-state-frame-potential-9854",
    title: "Towards Optimal Quantum Estimators for State Frame Potential",
    excerpt: "Exploring quantum state estimation.",
    content: "## Quantum Frame Potential\n\nFormula: $$\\mathcal{F} = \\int |\\langle \\psi | \\phi \\rangle|^{2t} d\\psi$$",
    readingTime: "9 min read",
    arxivLink: "https://arxiv.org/abs/2402.09854",
    bannerSvg: "<svg viewBox='0 0 800 400'></svg>",
    author: "Meridian Research",
    date: "February 27, 2026",
    tags: ["Quantum", "Physics"]
  },
  {
    id: "preloaded-1",
    slug: "quantum-optics-breakthrough",
    title: "Quantum Optics Breakthrough",
    excerpt: "Optics advances.",
    content: "Content",
    readingTime: "5 min read",
    arxivLink: "https://arxiv.org/abs/2301.12345",
    bannerSvg: "<svg></svg>",
    author: "Meridian",
    date: "January 1, 2026",
    tags: ["Optics"]
  }
];

// 1.1 Match by exact slug
const match1 = resolveBlogSlugOrId("towards-optimal-quantum-estimators-for-state-frame-potential-9854", sampleBlogs);
assert(match1 !== null, "Should match exact slug");
assert.strictEqual(match1?.id, "generated-1740685200000");

// 1.2 Match by base slug (missing numeric suffix)
const match2 = resolveBlogSlugOrId("towards-optimal-quantum-estimators-for-state-frame-potential", sampleBlogs);
assert(match2 !== null, "Should match base slug without suffix");
assert.strictEqual(match2?.id, "generated-1740685200000");

// 1.3 Match by ID
const match3 = resolveBlogSlugOrId("generated-1740685200000", sampleBlogs);
assert(match3 !== null, "Should match by ID");

// 1.4 Match by arXiv ID
const match4 = resolveBlogSlugOrId("2402.09854", sampleBlogs);
assert(match4 !== null, "Should match by arXiv ID");
console.log("✔ Slug resolution passed all 4 test cases.");

// TEST 2: Pipeline Auditor & Real-time Metrics
console.log("\n[TEST 2] Testing Pipeline Auditor & Real-Time Metrics...");
const jobId = "test-job-9999";
let tracker = createPipelineTracker(jobId, "2402.09854", "Towards Optimal Quantum Estimators", "Author A, Author B");
assert.strictEqual(tracker.status, "running");
assert.strictEqual(tracker.steps.length, 1);

// Record Step 1 completion and start Step 2
tracker = recordStepProgress(tracker, 1, "Angle Synthesis & Token Budgeting", "prompt_prep", "Angle: Theoretical physics");
assert.strictEqual(tracker.steps.length, 2);

// Token estimation test
const samplePrompt = "Please generate an academic article with mathematical formulations...";
const tokenEst = estimateTokens(samplePrompt);
assert(tokenEst > 0, "Token count must be greater than zero");

// Finalize Success
const finalRecord = finalizePipelineSuccess(
  tracker,
  sampleBlogs[0],
  "gemini-2.5-flash",
  "gemini",
  samplePrompt,
  JSON.stringify({ title: sampleBlogs[0].title }),
  {
    customBlogsJson: true,
    dataTs: true,
    firestore: true,
    gitHubMirror: false
  }
);
assert.strictEqual(finalRecord.status, "completed");
assert(typeof finalRecord.totalDurationMs === "number" && finalRecord.totalDurationMs >= 0);
assert(finalRecord.tokenUsage.totalTokens > 0);
assert.strictEqual(finalRecord.resultingBlog?.slug, "towards-optimal-quantum-estimators-for-state-frame-potential-9854");
console.log(`✔ Pipeline Auditor finalized record with ${finalRecord.steps.length} steps, ${finalRecord.tokenUsage.totalTokens} tokens estimated.`);


// TEST 3: Multi-Tier Redundancy & Persistence
console.log("\n[TEST 3] Testing 6-Tier Persistence & Snapshot Archive...");
const currentBlogs = readCustomBlogs();
const targetExists = currentBlogs.some(b => b.slug.includes("towards-optimal-quantum-estimators-for-state-frame-potential"));
assert(targetExists, "Missing paper must exist in custom_blogs.json");

// Test snapshot creation
const snapshotFile = createBlogSnapshot(currentBlogs);
assert(snapshotFile !== null && fs.existsSync(snapshotFile), "Snapshot archive must be written to disk");

// Test journal appending and retrieval
appendGenerationJournal(finalRecord);
const retrievedRecords = readPipelineRecords();
const recordFound = retrievedRecords.some(r => r.jobId === jobId);
assert(recordFound, "Appended generation record must be queryable from disk journal");
console.log(`✔ Disk Journal persisted and retrieved successfully. Total records stored: ${retrievedRecords.length}`);

// TEST 4: Persistence Manager Multi-Tier Write
console.log("\n[TEST 4] Testing persistMultiTierBlogs...");
(async () => {
  const persistResult = await persistMultiTierBlogs(currentBlogs, null, "Unit test batch verify");
  assert.strictEqual(persistResult.success, true);
  assert.strictEqual(persistResult.tiers.customBlogsJson, true);
  assert.strictEqual(persistResult.tiers.dataTs, true);
  assert.strictEqual(persistResult.tiers.snapshot, true);
  assert.strictEqual(persistResult.tiers.sitemap, true);
  console.log("✔ Multi-Tier Persistence verified all local layers (JSON, data.ts, Snapshot, Sitemap).");

  console.log("\n==========================================");
  console.log("ALL 9999% PERSISTENCE & PIPELINE TESTS PASSED (100%)");
  console.log("==========================================");
})();
