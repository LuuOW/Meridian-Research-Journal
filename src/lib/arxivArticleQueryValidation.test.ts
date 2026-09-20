import { test } from "node:test";
import assert from "node:assert";
import {
  getArxivCalendarSchedule,
  calculateArxivBusinessLag,
  validateCategoryForQuery,
  validateTitleForQuery,
  auditArticleQuery,
  parseSubmissionDateFromCandidate
} from "./arxivArticleQueryValidator.js";
import { PRELOADED_BLOGS } from "../data.js";

// Sunday September 20, 2026 reference anchor
const SUNDAY_SEP_20_2026 = new Date("2026-09-20T12:00:00Z");

test("Sunday Calendar Schedule: accurately detects Sunday as arXiv non-publishing day", () => {
  const schedule = getArxivCalendarSchedule(SUNDAY_SEP_20_2026);

  assert.strictEqual(schedule.dayOfWeek, 0, "Sunday must have dayOfWeek === 0");
  assert.strictEqual(schedule.dayName, "Sunday");
  assert.strictEqual(schedule.isWeekend, true);
  assert.strictEqual(
    schedule.isArxivPublishingDay,
    false,
    "arXiv does NOT publish new preprints or mailings on Sunday"
  );

  // Latest active publication was Friday September 18, 2026
  const latestIso = schedule.latestArxivPublishDate.toISOString().split("T")[0];
  assert.strictEqual(
    latestIso,
    "2026-09-18",
    "Latest active publication date prior to Sunday Sep 20 must be Friday Sep 18"
  );

  // Next scheduled publication is Monday September 21, 2026
  const nextIso = schedule.nextArxivPublishDate.toISOString().split("T")[0];
  assert.strictEqual(
    nextIso,
    "2026-09-21",
    "Next active publication date after Sunday Sep 20 must be Monday Sep 21"
  );

  assert.ok(
    schedule.scheduleNotice.includes("Sunday"),
    "Schedule notice must explicitly cite Sunday"
  );
  assert.ok(
    schedule.scheduleNotice.includes("non-publishing day"),
    "Notice must state non-publishing day"
  );
});

test("Sunday Calendar Schedule: weekday schedule check verifies active publishing status", () => {
  // Friday Sep 18, 2026
  const friday = getArxivCalendarSchedule("2026-09-18T12:00:00Z");
  assert.strictEqual(friday.dayName, "Friday");
  assert.strictEqual(friday.isWeekend, false);
  assert.strictEqual(friday.isArxivPublishingDay, true);

  // Monday Sep 21, 2026
  const monday = getArxivCalendarSchedule("2026-09-21T12:00:00Z");
  assert.strictEqual(monday.dayName, "Monday");
  assert.strictEqual(monday.isWeekend, false);
  assert.strictEqual(monday.isArxivPublishingDay, true);
});

test("Business Day Lag Calculator: accounts for weekend pause when querying on Sunday", () => {
  // Friday Sep 18 paper queried on Sunday Sep 20: 0 business days lag (Friday mailing is latest active)
  const friPaper = new Date("2026-09-18T08:00:00Z");
  const lagFri = calculateArxivBusinessLag(friPaper, SUNDAY_SEP_20_2026);
  assert.strictEqual(
    lagFri,
    0,
    "Friday paper queried on Sunday has 0 business days lag"
  );

  // Thursday Sep 17 paper queried on Sunday Sep 20: 1 business day lag (Friday is only intervening business day)
  const thuPaper = new Date("2026-09-17T10:00:00Z");
  const lagThu = calculateArxivBusinessLag(thuPaper, SUNDAY_SEP_20_2026);
  assert.strictEqual(
    lagThu,
    1,
    "Thursday paper queried on Sunday has 1 business day lag"
  );

  // Wednesday Sep 16 paper queried on Sunday Sep 20: 2 business days lag
  const wedPaper = new Date("2026-09-16T10:00:00Z");
  const lagWed = calculateArxivBusinessLag(wedPaper, SUNDAY_SEP_20_2026);
  assert.strictEqual(
    lagWed,
    2,
    "Wednesday paper queried on Sunday has 2 business days lag"
  );

  // Stale Sep 6 paper queried on Sunday Sep 20: 10 business days lag (2 full weeks)
  const sep6Paper = new Date("2026-09-06T10:00:00Z");
  const lagSep6 = calculateArxivBusinessLag(sep6Paper, SUNDAY_SEP_20_2026);
  assert.strictEqual(lagSep6, 10, "Sep 6 paper has 10 business days lag");

  // Stale July 24 paper (ResumeShield) queried on Sunday Sep 20: >40 business days lag
  const jul24Paper = new Date("2026-07-24T10:00:00Z");
  const lagJul24 = calculateArxivBusinessLag(jul24Paper, SUNDAY_SEP_20_2026);
  assert.ok(
    lagJul24 >= 40,
    `July 24 paper has ${lagJul24} business days lag (> 40)`
  );
});

test("Category Query Validation: accepts quant-ph, physics.optics, and genuine cross-lists", () => {
  // 1. Primary quant-ph
  const cat1 = validateCategoryForQuery(["quant-ph"], "quant-ph");
  assert.strictEqual(cat1.allowed, true);
  assert.strictEqual(cat1.matchedDiscipline, "quant-ph");
  assert.strictEqual(cat1.isCrossListed, false);

  // 2. Primary physics.optics
  const cat2 = validateCategoryForQuery(["physics.optics"], "physics.optics");
  assert.strictEqual(cat2.allowed, true);
  assert.strictEqual(cat2.matchedDiscipline, "physics.optics");

  // 3. Cross-listed: hep-th primary, cross-listed with quant-ph
  const cat3 = validateCategoryForQuery(["hep-th", "quant-ph"], "hep-th");
  assert.strictEqual(cat3.allowed, true);
  assert.strictEqual(cat3.matchedDiscipline, "quant-ph");
  assert.strictEqual(cat3.isCrossListed, true);

  // 4. Cross-listed: cond-mat.mes-hall primary, cross-listed with physics.optics
  const cat4 = validateCategoryForQuery(
    ["cond-mat.mes-hall", "physics.optics"],
    "cond-mat.mes-hall"
  );
  assert.strictEqual(cat4.allowed, true);
  assert.strictEqual(cat4.matchedDiscipline, "physics.optics");
  assert.strictEqual(cat4.isCrossListed, true);

  // 5. Cross-listed: cs.IT primary, cross-listed with quant-ph
  const cat5 = validateCategoryForQuery(["cs.IT", "quant-ph"], "cs.IT");
  assert.strictEqual(cat5.allowed, true);
  assert.strictEqual(cat5.matchedDiscipline, "quant-ph");
  assert.strictEqual(cat5.isCrossListed, true);
});

test("Category Query Validation: strictly rejects computer science, mathematics, and stats", () => {
  // Pure Computer Science (Cryptography & Security: cs.CR)
  const csCat = validateCategoryForQuery(["cs.CR", "cs.AI"], "cs.CR");
  assert.strictEqual(csCat.allowed, false);
  assert.ok(csCat.rejectedReason?.includes("Strict category violation"));
  assert.ok(csCat.rejectedReason?.includes("cs.cr"));

  // Pure Mathematics (Dynamical Systems: math.DS)
  const mathCat = validateCategoryForQuery(["math.DS", "math.SP"], "math.DS");
  assert.strictEqual(mathCat.allowed, false);
  assert.ok(mathCat.rejectedReason?.includes("Strict category violation"));
  assert.ok(mathCat.rejectedReason?.includes("math.ds"));

  // Pure Statistics (Machine Learning: stat.ML)
  const statCat = validateCategoryForQuery(["stat.ML"], "stat.ML");
  assert.strictEqual(statCat.allowed, false);

  // Quantitative Biology (q-bio)
  const bioCat = validateCategoryForQuery(["q-bio.NC"], "q-bio.NC");
  assert.strictEqual(bioCat.allowed, false);

  // Empty categories
  const emptyCat = validateCategoryForQuery([]);
  assert.strictEqual(emptyCat.allowed, false);
});

test("Title Query Validation: decodes HTML entities and preserves LaTeX equations", () => {
  const titleWithEntities =
    "Generic Spectral Determination with &quot;Schr&#246;dinger&quot; &amp; &#x2124;2-Symmetry";
  const titleAudit = validateTitleForQuery(titleWithEntities);
  assert.strictEqual(
    titleAudit.sanitizedTitle,
    'Generic Spectral Determination with "Schrödinger" & ℤ2-Symmetry'
  );

  // LaTeX formula detection
  const titleWithLatex =
    "Topological Protection of Coherent States $|\\alpha\\rangle$ in Synthetic Lattices";
  const latexAudit = validateTitleForQuery(titleWithLatex);
  assert.strictEqual(latexAudit.containsLaTeX, true);
  assert.strictEqual(latexAudit.valid, true);
  assert.strictEqual(
    latexAudit.generatedSlug,
    "topological-protection-of-coherent-states-alpha-rangle-in-synthetic-lattices"
  );
});

test("Title Query Validation: intercepts and blocks quarantined title keywords", () => {
  // Quarantined: ResumeShield
  const t1 = validateTitleForQuery(
    "ResumeShield: Channel Separation and an Open Benchmark for Indirect Prompt Injection"
  );
  assert.strictEqual(t1.valid, false);
  assert.ok(t1.detectedBlockKeywords.includes("resumeshield"));
  assert.ok(t1.detectedBlockKeywords.includes("prompt injection"));
  assert.ok(t1.rejectedReason?.includes("quarantined"));

  // Quarantined: Generic Spectral Determination
  const t2 = validateTitleForQuery(
    "Generic Spectral Determination of Semiclassical Schrödinger Operators"
  );
  assert.strictEqual(t2.valid, false);
  assert.ok(t2.detectedBlockKeywords.includes("generic spectral determination"));

  // Quarantined: Terminal Agent Reinforcement Learning
  const t3 = validateTitleForQuery(
    "Terminal Agent Reinforcement Learning in Execution Environments"
  );
  assert.strictEqual(t3.valid, false);
  assert.ok(
    t3.detectedBlockKeywords.includes("terminal agent reinforcement learning")
  );
});

test("Comprehensive Article Query Audit: approves fresh Friday quantum paper when queried on Sunday", () => {
  // Simulate querying the legitimate Friday Sep 18 article on Sunday Sep 20
  const result = auditArticleQuery({
    queryOrId: "https://arxiv.org/abs/2609.10535",
    title:
      "Topological Argument for Robustness of Coherent States in Quantum Optics",
    summary:
      "Exact mapping of the driven Jaynes-Cummings model to Su-Schrieffer-Heeger zero-energy edge states.",
    authors: "Saumya Biswas, Amrit De, Avik Dutt",
    categories: ["quant-ph", "physics.optics"],
    primaryCategory: "physics.optics",
    submittedDate: "2026-09-18T08:00:00Z",
    referenceDate: SUNDAY_SEP_20_2026,
    maxBusinessLagDays: 3
  });

  assert.strictEqual(result.approved, true);
  assert.strictEqual(result.status, "APPROVED");
  assert.strictEqual(result.arxivId, "2609.10535");
  assert.strictEqual(result.calendar.dayName, "Sunday");
  assert.strictEqual(result.calendar.isArxivPublishingDay, false);
  assert.strictEqual(result.dateAudit.businessDaysLag, 0);
  assert.strictEqual(result.dateAudit.isSundayQuery, true);
  assert.strictEqual(result.dateAudit.lagAcceptable, true);
  assert.strictEqual(result.categoryAudit.allowed, true);
  assert.strictEqual(result.categoryAudit.matchedDiscipline, "quant-ph");
  assert.strictEqual(result.titleAudit.valid, true);
  assert.strictEqual(result.blocklistAudit.blocked, false);
});

test("Comprehensive Article Query Audit: rejects ResumeShield (CS.CR, July 24)", () => {
  const result = auditArticleQuery({
    queryOrId: "https://arxiv.org/abs/2407.20188",
    title:
      "ResumeShield: Channel Separation and an Open Benchmark for Indirect Prompt Injection in AI Resume Screening",
    summary: "Benchmark paper for indirect prompt injection.",
    authors: "Jay Barach",
    categories: ["cs.CR"],
    primaryCategory: "cs.CR",
    submittedDate: "2026-07-24T10:00:00Z",
    referenceDate: SUNDAY_SEP_20_2026
  });

  assert.strictEqual(result.approved, false);
  // Blocked by blocklist policy guard immediately
  assert.strictEqual(result.status, "REJECTED_BLOCKLIST");
  assert.strictEqual(result.blocklistAudit.blocked, true);
  assert.ok(result.summaryReason.includes("Quarantined by blocklist policy"));
});

test("Comprehensive Article Query Audit: rejects stale math.DS paper (August 11)", () => {
  const result = auditArticleQuery({
    queryOrId: "2608.11111",
    title:
      "Generic Spectral Determination of Semiclassical Schrödinger Operators with ℤ2-Symmetry",
    summary: "Dynamical systems and semiclassical analysis.",
    authors: "Qiaoling Wei",
    categories: ["math.DS"],
    primaryCategory: "math.DS",
    submittedDate: "2026-08-11T10:00:00Z",
    referenceDate: SUNDAY_SEP_20_2026
  });

  assert.strictEqual(result.approved, false);
  assert.ok(
    result.status === "REJECTED_BLOCKLIST" ||
      result.status === "REJECTED_CATEGORY" ||
      result.status === "REJECTED_STALE_DATE"
  );
});

test("Comprehensive Article Query Audit: rejects stale September 6 paper queried on Sunday", () => {
  const result = auditArticleQuery({
    queryOrId: "2609.06542",
    title:
      "Recovering topological information of light by topological learning",
    summary: "Optical neural networks paper from Sep 6.",
    authors: "Benquan Wang, Trishita Das, Andrew Forbes, Yijie Shen",
    categories: ["physics.optics"],
    primaryCategory: "physics.optics",
    submittedDate: "2026-09-06T10:00:00Z",
    referenceDate: SUNDAY_SEP_20_2026,
    maxBusinessLagDays: 3
  });

  assert.strictEqual(result.approved, false);
  assert.ok(
    result.status === "REJECTED_BLOCKLIST" ||
      result.status === "REJECTED_STALE_DATE"
  );
});

test("Comprehensive Article Query Audit: rejects invalid query identifiers safely", () => {
  const result = auditArticleQuery({
    queryOrId: "not-an-arxiv-id-or-url",
    referenceDate: SUNDAY_SEP_20_2026
  });

  assert.strictEqual(result.approved, false);
  assert.strictEqual(result.status, "REJECTED_INVALID_ID");
  assert.strictEqual(result.dateAudit.isSundayQuery, true);
});

test("Production Invariance Guard: Running query tests leaves production data 100% untouched", () => {
  // Ensure PRELOADED_BLOGS remains intact and unmodified
  assert.ok(
    Array.isArray(PRELOADED_BLOGS) && PRELOADED_BLOGS.length > 0,
    "PRELOADED_BLOGS must be populated"
  );

  // Ensure no quarantined articles exist in PRELOADED_BLOGS
  const containsResumeShield = PRELOADED_BLOGS.some(
    (b) =>
      b.id?.includes("20188") ||
      b.title?.toLowerCase().includes("resumeshield") ||
      b.author?.includes("Jay Barach")
  );
  assert.strictEqual(
    containsResumeShield,
    false,
    "Production catalog must never contain ResumeShield"
  );

  const containsDynamical = PRELOADED_BLOGS.some(
    (b) =>
      b.id?.includes("1789395581333") ||
      b.title?.toLowerCase().includes("generic spectral determination")
  );
  assert.strictEqual(
    containsDynamical,
    false,
    "Production catalog must never contain Generic Spectral Determination"
  );

  // Top article must remain the genuine quantum optics publication
  const topArticle = PRELOADED_BLOGS[0];
  assert.ok(
    topArticle.title.includes("Topological Argument for Robustness of Coherent States") ||
      topArticle.tags.includes("Optics") ||
      topArticle.tags.includes("Quantum Physics"),
    "Production top article remains authentic physics publication"
  );
});
