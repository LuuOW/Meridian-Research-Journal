import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateCategoryPolicy,
  validatePreprintFreshness,
  extractPreprintSubmissionDate,
  vectorizeText,
  computeCosineSimilarity,
  queryCorpusRag,
  ArxivAutonomousPipeline,
  ArxivPaperCandidate
} from "./arxivAutonomousPipeline";
import { BlogPost } from "../types";

const MOCK_CORPUS: BlogPost[] = [
  {
    id: "blog-1",
    title: "Correlation geometry and topology of structured optical beams",
    slug: "correlation-geometry-topology-optical-beams",
    excerpt: "Orbital angular momentum modes in random scalar optical beams.",
    content: "Content with Hamiltonian and Berry curvature...",
    date: "September 16, 2026",
    readingTime: "7 min read",
    arxivLink: "https://arxiv.org/abs/2609.19103",
    bannerSvg: "<svg></svg>",
    author: "Jyrki Laatikainen, Olga Korotkova",
    tags: ["Optics", "Photonics", "Waveguides"]
  },
  {
    id: "blog-2",
    title: "Unified light-matter metric of molecular and nanophotonic chirality",
    slug: "unified-light-matter-metric-chirality",
    excerpt: "Pseudoscalar chirality metric in nanophotonic resonators.",
    content: "Content with Maxwell-Bloch equations...",
    date: "September 14, 2026",
    readingTime: "8 min read",
    arxivLink: "https://arxiv.org/abs/2609.13109",
    bannerSvg: "<svg></svg>",
    author: "Kevin N. Moser, Marc R. Bourgeois",
    tags: ["Optics", "Photonics", "Chirality"]
  },
  {
    id: "blog-3",
    title: "d+1 Measurement Bases are Sufficient for Determining d-Dimensional Quantum States",
    slug: "d-plus-1-measurement-bases-quantum-states",
    excerpt: "Quantum state tomography and projective measurements.",
    content: "Content with density matrices and Hilbert spaces...",
    date: "September 15, 2026",
    readingTime: "7 min read",
    arxivLink: "https://arxiv.org/abs/2507.11204",
    bannerSvg: "<svg></svg>",
    author: "Tianqi Xiao, Yaxin Wang",
    tags: ["Quantum", "Hamiltonians", "Tomography"]
  }
];

describe("ArXiv Autonomous Ingestion Pipeline - Category & Date Guards", () => {
  // Test Case 1: The problematic Math paper reported by the user
  const MATH_PAPER_AUG11: ArxivPaperCandidate = {
    id: "2608.11111",
    title: "Generic Spectral Determination of Semiclassical Schrödinger Operators with ℤ2-Symmetry",
    summary: "Spectral asymptotics and semiclassical trace formulas for differential operators.",
    authors: "Qiaoling Wei",
    categories: ["math.DS"],
    primaryCategory: "math.DS",
    submittedDate: "2026-08-11T14:32:00Z"
  };

  // Test Case 2: The stale September 6 Optics paper reported by the user
  const STALE_OPTICS_SEP6: ArxivPaperCandidate = {
    id: "2609.06542",
    title: "Recovering topological information of light by topological learning",
    summary: "Reconstruction of topological invariants from complex optical intensity patterns.",
    authors: "Benquan Wang, Trishita Das, Yuhan Peng, Yijie Shen",
    categories: ["physics.optics"],
    primaryCategory: "physics.optics",
    submittedDate: "2026-09-06T10:15:00Z"
  };

  // Test Case 3: Legitimate September 17 paper
  const VALID_QUANT_PH_SEP17: ArxivPaperCandidate = {
    id: "2609.19854",
    title: "Universal Non-Abelian Holonomic Quantum Computation via Topologically Protected Squeezed Optical States",
    summary: "Demonstration of non-Abelian holonomies in continuous-variable quantum optical resonators.",
    authors: "E. S. Morozov, K. L. Vance, H. Zhang",
    categories: ["quant-ph", "physics.optics"],
    primaryCategory: "quant-ph",
    submittedDate: "2026-09-17T18:22:00Z"
  };

  // Test Case 4: Legitimate September 18 paper
  const VALID_OPTICS_SEP18: ArxivPaperCandidate = {
    id: "2609.20188",
    title: "Topological Soliton Frequency Combs in Anisotropic High-Q Microresonators",
    summary: "Dissipative Kerr soliton generation protected by synthetic dimensions in optical microresonators.",
    authors: "S. Tanaka, F. Laurent, M. B. Alvarez",
    categories: ["physics.optics"],
    primaryCategory: "physics.optics",
    submittedDate: "2026-09-18T09:45:00Z"
  };

  describe("1. Strict Category Policy Enforcement", () => {
    it("strictly rejects papers outside 'quant-ph' and 'physics.optics' (e.g. math.DS)", () => {
      const result = validateCategoryPolicy(MATH_PAPER_AUG11);
      assert.equal(result.allowed, false);
      assert.ok(result.rejectedReason?.includes("Strict category violation"));
      assert.ok(result.rejectedReason?.includes("math.ds"));
    });

    it("rejects computer science and unrelated disciplines (cs.AI, hep-th)", () => {
      const csPaper: ArxivPaperCandidate = {
        id: "2609.09999",
        title: "Deep Reinforcement Learning Survey",
        summary: "Neural network policies...",
        authors: "Researcher",
        categories: ["cs.AI", "cs.LG"]
      };
      const result = validateCategoryPolicy(csPaper);
      assert.equal(result.allowed, false);
    });

    it("accepts valid physics.optics candidate", () => {
      const result = validateCategoryPolicy(STALE_OPTICS_SEP6);
      assert.equal(result.allowed, true);
      assert.equal(result.matchedCategory, "physics.optics");
    });

    it("accepts valid quant-ph candidate and identifies primary discipline", () => {
      const result = validateCategoryPolicy(VALID_QUANT_PH_SEP17);
      assert.equal(result.allowed, true);
      assert.equal(result.matchedCategory, "quant-ph");
    });
  });

  describe("2. Submission Date & Freshness Enforcement", () => {
    const targetPublishDate = new Date("2026-09-18T12:00:00Z");

    it("extracts submission dates accurately from explicit metadata and ID", () => {
      const d1 = extractPreprintSubmissionDate(MATH_PAPER_AUG11);
      assert.equal(d1.getUTCMonth(), 7); // August is month 7 (0-indexed)

      const d2 = extractPreprintSubmissionDate(VALID_OPTICS_SEP18);
      assert.equal(d2.getUTCMonth(), 8); // September is month 8 (0-indexed)
    });

    it("strictly rejects papers from August 11 when publishing for September 18", () => {
      const result = validatePreprintFreshness(MATH_PAPER_AUG11, targetPublishDate, 2);
      assert.equal(result.valid, false);
      assert.ok(result.lagDays > 30);
      assert.ok(result.reason?.includes("REJECTED_STALE_SUBMISSION"));
    });

    it("strictly rejects papers from September 6 when publishing for September 18", () => {
      const result = validatePreprintFreshness(STALE_OPTICS_SEP6, targetPublishDate, 2);
      assert.equal(result.valid, false);
      assert.equal(result.lagDays, 12);
      assert.ok(result.reason?.includes("REJECTED_STALE_SUBMISSION"));
    });

    it("approves fresh papers submitted on September 17/18 for the September 18 cycle", () => {
      const result17 = validatePreprintFreshness(VALID_QUANT_PH_SEP17, targetPublishDate, 2);
      assert.equal(result17.valid, true);
      assert.ok(result17.lagDays <= 2);

      const result18 = validatePreprintFreshness(VALID_OPTICS_SEP18, targetPublishDate, 2);
      assert.equal(result18.valid, true);
      assert.ok(result18.lagDays <= 1);
    });
  });

  describe("3. RAG, Vectorization & Corpus Similarity Query", () => {
    it("vectorizes text into normalized term frequencies", () => {
      const text = "topological soliton microresonator frequency comb";
      const vec = vectorizeText(text);
      assert.ok(vec.has("topological"));
      assert.ok(vec.has("soliton"));
      assert.ok(vec.has("microresonator"));

      // Verify L2 norm is ~1
      let sumSq = 0;
      for (const val of vec.values()) sumSq += val * val;
      assert.ok(Math.abs(sumSq - 1.0) < 0.001);
    });

    it("computes cosine similarity accurately", () => {
      const vec1 = vectorizeText("topological photonics quantum waveguide");
      const vec2 = vectorizeText("topological photonics quantum waveguide");
      const vec3 = vectorizeText("molecular biology genome sequencing");

      const highSim = computeCosineSimilarity(vec1, vec2);
      const lowSim = computeCosineSimilarity(vec1, vec3);

      assert.ok(highSim > 0.99);
      assert.ok(lowSim < 0.1);
    });

    it("retrieves top relevant blogs from corpus and calculates balance", () => {
      const rag = queryCorpusRag(VALID_QUANT_PH_SEP17, MOCK_CORPUS);
      assert.ok(rag.topRelatedBlogs.length > 0);
      assert.equal(rag.isDuplicate, false);
      assert.ok(Math.abs(rag.corpusOpticsBalance + rag.corpusQuantPhBalance - 1.0) < 0.1);
    });
  });

  describe("4. End-to-End Automated Pipeline Execution with Telemetry & Timeouts", () => {
    it("rejects out-of-category papers early with diagnostic telemetry logs", async () => {
      const pipeline = new ArxivAutonomousPipeline();
      const report = await pipeline.executePipeline(MATH_PAPER_AUG11, MOCK_CORPUS, {
        targetDate: new Date("2026-09-17T12:00:00Z")
      });

      assert.equal(report.status, "REJECTED_CATEGORY");
      assert.equal(report.generatedBlog, undefined);

      const failedLog = report.telemetryLogs.find((l) => l.status === "FAILED");
      assert.ok(failedLog);
      assert.equal(failedLog?.stepName, "Strict Category Gate");
    });

    it("rejects stale September 6 papers with diagnostic telemetry logs", async () => {
      const pipeline = new ArxivAutonomousPipeline();
      const report = await pipeline.executePipeline(STALE_OPTICS_SEP6, MOCK_CORPUS, {
        targetDate: new Date("2026-09-18T12:00:00Z"),
        maxFreshnessLagDays: 2
      });

      assert.equal(report.status, "REJECTED_STALE_DATE");
      assert.equal(report.freshnessAudit?.valid, false);

      const staleLog = report.telemetryLogs.find((l) => l.stepName === "Preprint Freshness Validation");
      assert.equal(staleLog?.status, "FAILED");
    });

    it("triggers timeout failure when network timeout budget is too low (<50ms)", async () => {
      const pipeline = new ArxivAutonomousPipeline();
      const report = await pipeline.executePipeline(VALID_OPTICS_SEP18, MOCK_CORPUS, {
        targetDate: new Date("2026-09-18T12:00:00Z"),
        networkTimeoutMs: 30 // Triggers minimum timeout simulation
      });

      assert.equal(report.status, "FAILED_TIMEOUT");
      const timeoutLog = report.telemetryLogs.find((l) => l.status === "TIMEOUT");
      assert.ok(timeoutLog);
      assert.ok(timeoutLog?.details.includes("timeout"));
    });

    it("completes full pipeline execution for verified fresh September 17 paper", async () => {
      const pipeline = new ArxivAutonomousPipeline();
      const report = await pipeline.executePipeline(VALID_QUANT_PH_SEP17, MOCK_CORPUS, {
        targetDate: new Date("2026-09-17T12:00:00Z"),
        networkTimeoutMs: 3000
      });

      assert.equal(report.status, "COMPLETED");
      assert.ok(report.generatedBlog);
      assert.equal(report.generatedBlog?.title, VALID_QUANT_PH_SEP17.title);
      assert.ok(report.generatedBlog?.content.includes("\\hat{\\mathcal{H}}"));
      assert.ok(report.generatedBlog?.date.includes("September 17, 2026"));

      // Verify all steps logged
      const stepNames = report.telemetryLogs.map((l) => l.stepName);
      assert.ok(stepNames.includes("Candidate Registration"));
      assert.ok(stepNames.includes("Strict Category Gate"));
      assert.ok(stepNames.includes("Preprint Freshness Validation"));
      assert.ok(stepNames.includes("RAG Vector Query & Saturation"));
      assert.ok(stepNames.includes("Upstream Network Verification"));
      assert.ok(stepNames.includes("Scholarly Synthesis & KaTeX Validation"));
    });

    it("completes full pipeline execution for verified fresh September 18 paper", async () => {
      const pipeline = new ArxivAutonomousPipeline();
      const report = await pipeline.executePipeline(VALID_OPTICS_SEP18, MOCK_CORPUS, {
        targetDate: new Date("2026-09-18T12:00:00Z"),
        networkTimeoutMs: 3000
      });

      assert.equal(report.status, "COMPLETED");
      assert.ok(report.generatedBlog);
      assert.equal(report.generatedBlog?.title, VALID_OPTICS_SEP18.title);
      assert.ok(report.generatedBlog?.date.includes("September 18, 2026"));
    });
  });
});
