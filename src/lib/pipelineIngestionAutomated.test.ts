import { test } from "node:test";
import assert from "node:assert";
import {
  checkArticleBlocked,
  isArticleBlocked,
  logBlockedArticle,
  filterBlockedArticles,
  BLOCKED_ARXIV_IDS,
  BLOCKED_TITLE_KEYWORDS,
  BLOCKED_SLUGS
} from "./arxivBlocklist.js";
import {
  validateCategoryPolicy,
  validatePreprintFreshness
} from "./arxivAutonomousPipeline.js";
import {
  parseArxivInput,
  parseInjectionResponse,
  replaceBlogInCatalog
} from "./arxivInjectionUtils.js";
import { parseArxivXml } from "./arxivUtils.js";
import { BlogPost } from "../types.js";

test("Pipeline Ingestion Guard: explicitly blocks ResumeShield and CS/Crypto papers", () => {
  // 1. Direct arXiv ID check (July 24 & September alias for ResumeShield)
  const check1 = checkArticleBlocked("2407.20188");
  assert.strictEqual(check1.blocked, true);
  assert.strictEqual(check1.rule, "ARXIV_ID");
  assert.ok(check1.reason?.includes("2407.20188"));

  const check2 = checkArticleBlocked("2609.20188");
  assert.strictEqual(check2.blocked, true);
  assert.strictEqual(check2.rule, "ARXIV_ID");

  // 2. Prohibited author check (Jay Barach)
  const authorCheck = checkArticleBlocked({
    id: "blog-sample-test",
    title: "Arbitrary Title",
    authors: "Jay Barach"
  });
  assert.strictEqual(authorCheck.blocked, true);
  assert.strictEqual(authorCheck.rule, "AUTHOR");
  assert.ok(authorCheck.reason?.includes("Jay Barach"));

  // 3. Prohibited title keyword check
  const titleCheck = checkArticleBlocked({
    title: "ResumeShield: Channel Separation and an Open Benchmark for Indirect Prompt Injection"
  });
  assert.strictEqual(titleCheck.blocked, true);
  assert.strictEqual(titleCheck.rule, "TITLE_KEYWORD");
  assert.ok(titleCheck.reason?.includes("resumeshield"));

  // 4. Content signature check
  const contentCheck = checkArticleBlocked({
    content: "We present ResumeShield for indirect prompt injection in AI resume screening."
  });
  assert.strictEqual(contentCheck.blocked, true);
  assert.strictEqual(contentCheck.rule, "CONTENT_SIGNATURE");
});

test("Pipeline Ingestion Guard: explicitly blocks stale math.DS paper (Generic Spectral Determination)", () => {
  const checkId = checkArticleBlocked("2608.11111");
  assert.strictEqual(checkId.blocked, true);
  assert.strictEqual(checkId.rule, "ARXIV_ID");

  const checkTitle = checkArticleBlocked({
    title: "Generic Spectral Determination of Semiclassical Schrödinger Operators with ℤ2-Symmetry"
  });
  assert.strictEqual(checkTitle.blocked, true);
  assert.strictEqual(checkTitle.rule, "TITLE_KEYWORD");

  // Category check when purely in math.DS without optics/quant-ph
  const checkCategory = checkArticleBlocked({
    primaryCategory: "math.DS",
    categories: ["math.DS", "math.SP"]
  });
  assert.strictEqual(checkCategory.blocked, true);
  assert.strictEqual(checkCategory.rule, "DISALLOWED_CATEGORY");
});

test("Pipeline Ingestion Guard: explicitly blocks stale Sep 6 paper (Recovering topological information of light)", () => {
  const checkId = checkArticleBlocked("2609.06542");
  assert.strictEqual(checkId.blocked, true);
  assert.strictEqual(checkId.rule, "ARXIV_ID");

  const checkSlug = checkArticleBlocked("recovering-topological-information-of-light-by-topological-learning");
  assert.strictEqual(checkSlug.blocked, true);
  assert.strictEqual(checkSlug.rule, "SLUG");
});

test("Pipeline Ingestion Guard: telemetry logger outputs formatted warning with diagnostic reason", () => {
  const logs: string[] = [];
  const originalWarn = console.warn;
  console.warn = (msg: string) => {
    logs.push(msg);
  };

  try {
    const result = logBlockedArticle("2407.20188", "Ingestion Automated Test");
    assert.strictEqual(result.blocked, true);
    assert.strictEqual(result.rule, "ARXIV_ID");
    assert.ok(logs.length > 0);
    assert.ok(logs[0].includes("[ArXiv Blocklist Policy Guard][Ingestion Automated Test] QUARANTINED:"));
    assert.ok(logs[0].includes("2407.20188"));
  } finally {
    console.warn = originalWarn;
  }
});

test("Pipeline Category Validation: strictly allows quant-ph and physics.optics, rejecting CS/math", () => {
  // 1. quant-ph paper should pass
  const quantPaper = {
    id: "2609.10535",
    title: "Coherent Quantum State Manipulation",
    summary: "Theoretical exploration of quantum coherence.",
    authors: "Dr. Elena Rostova",
    primaryCategory: "quant-ph",
    categories: ["quant-ph"]
  };
  const quantResult = validateCategoryPolicy(quantPaper);
  assert.strictEqual(quantResult.allowed, true);

  // 2. physics.optics paper should pass
  const opticsPaper = {
    id: "2609.10533",
    title: "Microcavity Topological Solitons",
    summary: "Nonlinear optics in microresonators.",
    authors: "Dr. Marcus Vance",
    primaryCategory: "physics.optics",
    categories: ["physics.optics"]
  };
  const opticsResult = validateCategoryPolicy(opticsPaper);
  assert.strictEqual(opticsResult.allowed, true);

  // 3. Cross-listed paper containing quant-ph should pass
  const crossPaper = {
    id: "2609.10534",
    title: "Quantum Information Channels",
    summary: "Information bounds on quantum channels.",
    authors: "Dr. Jane Doe",
    primaryCategory: "cs.IT",
    categories: ["cs.IT", "quant-ph"]
  };
  const crossResult = validateCategoryPolicy(crossPaper);
  assert.strictEqual(crossResult.allowed, true);

  // 4. Computer science paper (cs.CR) without physics must fail
  const cryptoPaper = {
    id: "2407.20188",
    title: "ResumeShield: Indirect Prompt Injection",
    summary: "LLM benchmark paper.",
    authors: "Jay Barach",
    primaryCategory: "cs.CR",
    categories: ["cs.CR", "cs.AI"]
  };
  const cryptoResult = validateCategoryPolicy(cryptoPaper);
  assert.strictEqual(cryptoResult.allowed, false);
  assert.ok(cryptoResult.rejectedReason?.includes("Strict category violation"));

  // 5. Pure mathematics paper (math.DS) without physics must fail
  const mathPaper = {
    id: "2608.11111",
    title: "Generic Spectral Determination",
    summary: "Schrodinger operators dynamical systems.",
    authors: "Qiaoling Wei",
    primaryCategory: "math.DS",
    categories: ["math.DS"]
  };
  const mathResult = validateCategoryPolicy(mathPaper);
  assert.strictEqual(mathResult.allowed, false);
});

test("Pipeline Freshness Validation: flags preprints submitted outside allowed publication window", () => {
  // Target date: September 18, 2026
  const targetDate = new Date("2026-09-18T12:00:00Z");

  // A. Stale paper from July 24, 2026 (ResumeShield) -> 56 days lag
  const stalePaper = {
    id: "2407.20188",
    title: "ResumeShield Benchmark",
    summary: "Old paper from July.",
    authors: "Jay Barach",
    categories: ["cs.CR"],
    submittedDate: "2026-07-24T10:00:00Z"
  };
  const staleResult = validatePreprintFreshness(stalePaper, targetDate, 3);
  assert.strictEqual(staleResult.valid, false);
  assert.ok(staleResult.lagDays > 30);
  assert.ok(staleResult.reason?.includes("REJECTED_STALE_SUBMISSION"));

  // B. Stale paper from August 11, 2026 -> 38 days lag
  const augPaper = {
    id: "2608.11111",
    title: "Generic Spectral Determination",
    summary: "August dynamical systems paper.",
    authors: "Qiaoling Wei",
    categories: ["math.DS"],
    submittedDate: "2026-08-11T10:00:00Z"
  };
  const augResult = validatePreprintFreshness(augPaper, targetDate, 3);
  assert.strictEqual(augResult.valid, false);
  assert.ok(augResult.lagDays > 30);

  // C. Fresh paper from September 18, 2026 -> 0 days lag
  const freshPaper = {
    id: "2609.10535",
    title: "Topological Argument for Robustness of Coherent States in Quantum Optics",
    summary: "Submitted today.",
    authors: "Meridian Authors",
    categories: ["quant-ph", "physics.optics"],
    submittedDate: "2026-09-18T08:00:00Z"
  };
  const freshResult = validatePreprintFreshness(freshPaper, targetDate, 3);
  assert.strictEqual(freshResult.valid, true);
  assert.strictEqual(freshResult.lagDays, 0);
});

test("Pipeline XML Parser: extracts primaryCategory, categories, and submittedDate from arXiv feed", () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2609.10535v1</id>
    <published>2026-09-18T08:30:00Z</published>
    <title>Topological Argument for Robustness of Coherent States in Quantum Optics</title>
    <summary>We rigorously prove topological phase protection in non-linear optics.</summary>
    <author><name>Dr. Elena Rostova</name></author>
    <arxiv:primary_category term="quant-ph" />
    <category term="quant-ph" />
    <category term="physics.optics" />
  </entry>
</feed>`;

  const meta = parseArxivXml(sampleXml);
  assert.strictEqual(meta.title, "Topological Argument for Robustness of Coherent States in Quantum Optics");
  assert.strictEqual(meta.primaryCategory, "quant-ph");
  assert.deepStrictEqual(meta.categories, ["quant-ph", "physics.optics"]);
  assert.strictEqual(meta.submittedDate, "2026-09-18T08:30:00Z");
});

test("Pipeline Timeout & Error Resilience: parseInjectionResponse handles gateway 504 and network drops", () => {
  // Test 504 Gateway Timeout
  const gatewayTimeoutHtml = `<html><head><title>504 Gateway Time-out</title></head><body><h1>504 Gateway Time-out</h1></body></html>`;
  const resTimeout = parseInjectionResponse(gatewayTimeoutHtml, 504, "Gateway Time-out");
  assert.strictEqual(resTimeout.success, false);
  assert.ok(resTimeout.error?.includes("504"));
  assert.ok(resTimeout.error?.includes("Gateway Time-out"));

  // Test 403 Forbidden Unauthorized
  const forbiddenJson = JSON.stringify({ error: "Unauthorized: Invalid editor password" });
  const resForbidden = parseInjectionResponse(forbiddenJson, 403, "Forbidden");
  assert.strictEqual(resForbidden.success, false);
  assert.ok(resForbidden.error?.includes("Unauthorized"));

  // Test Quarantined 400 rejection
  const blockedJson = JSON.stringify({
    success: false,
    error: "Preprint is quarantined from Meridian: ArXiv ID 2407.20188 is permanently quarantined"
  });
  const resBlocked = parseInjectionResponse(blockedJson, 400, "Bad Request");
  assert.strictEqual(resBlocked.success, false);
  assert.ok(resBlocked.error?.includes("quarantined"));
});

test("Catalog Protection: filterBlockedArticles purges all quarantined records", () => {
  const mixedCatalog: Partial<BlogPost>[] = [
    {
      id: "blog-valid-1",
      slug: "topological-soliton-frequency-combs-anisotropic-microresonators",
      title: "Topological Argument for Robustness of Coherent States in Quantum Optics",
      arxivLink: "https://arxiv.org/abs/2609.10535"
    },
    {
      id: "blog-2609-20188v1-3829",
      slug: "resumeshield-channel-separation-and-an-open-benchmark",
      title: "ResumeShield: Channel Separation and an Open Benchmark",
      arxivLink: "https://arxiv.org/abs/2407.20188"
    },
    {
      id: "blog-valid-2",
      slug: "photonic-quantum-memories",
      title: "High-Fidelity Photonic Quantum Memories",
      arxivLink: "https://arxiv.org/abs/2609.10533"
    },
    {
      id: "blog-1789395581333-o2y84",
      slug: "generic-spectral-determination-of-semiclassical-schrodinger",
      title: "Generic Spectral Determination of Semiclassical Schrödinger Operators",
      arxivLink: "https://arxiv.org/abs/2608.11111"
    }
  ];

  const cleaned = filterBlockedArticles(mixedCatalog);
  assert.strictEqual(cleaned.length, 2);
  assert.strictEqual(cleaned[0].id, "blog-valid-1");
  assert.strictEqual(cleaned[1].id, "blog-valid-2");
  assert.ok(!cleaned.some(b => b.id?.includes("20188") || b.id?.includes("1789395581333")));
});

test("Catalog Ingestion: replaceBlogInCatalog preserves exact position when target is replaced", () => {
  const catalog: BlogPost[] = [
    { id: "art-1", slug: "slug-1", title: "Article 1" } as BlogPost,
    { id: "art-2", slug: "target-slug", title: "Target Article To Replace" } as BlogPost,
    { id: "art-3", slug: "slug-3", title: "Article 3" } as BlogPost
  ];

  const replacement: BlogPost = {
    id: "art-2-new",
    slug: "new-quantum-article",
    title: "New Quantum Optics Article",
    arxivLink: "https://arxiv.org/abs/2609.10535"
  } as BlogPost;

  const updated = replaceBlogInCatalog(catalog, replacement, "art-2", true);
  assert.strictEqual(updated.length, 3);
  assert.strictEqual(updated[0].id, "art-1");
  assert.strictEqual(updated[1].id, "art-2-new"); // preserved at index 1!
  assert.strictEqual(updated[2].id, "art-3");
});
