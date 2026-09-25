import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseArxivAbstractHtml,
  verifyPreprintDateMatch,
  scrapeAndFilterCandidatesByDate,
  extractArxivIdFromInput,
  normalizeDateToIso,
  ScrapedArxivPage
} from "./ArxivWebScraper";

describe("ArXiv Web Scraper & Date Verification Suite", () => {
  // Test Case 1: Exact reproduction of user screenshot
  // Category: Quantum Physics
  // Dateline: [Submitted on 23 Sep 2026]
  // Title: Compressed Permutation Oracles Revisited
  // Authors: Joseph Carolan, Christian Majenz
  const sampleUserScreenshotHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head><title>[2609.26123] Compressed Permutation Oracles Revisited</title></head>
    <body>
      <div id="header">
        <h1><a href="/">arXiv</a></h1>
      </div>
      <div class="header-breadcrumbs">
        <h2>Quantum Physics</h2>
      </div>
      <div class="dateline">[Submitted on 23 Sep 2026]</div>
      <h1 class="title mathjax"><span class="descriptor">Title:</span>Compressed Permutation Oracles Revisited</h1>
      <div class="authors">
        <span class="descriptor">Authors:</span>
        <a href="/search/quant-ph?searchtype=author&amp;query=Carolan,+J">Joseph Carolan</a>,
        <a href="/search/quant-ph?searchtype=author&amp;query=Majenz,+C">Christian Majenz</a>
      </div>
      <blockquote class="abstract mathjax">
        <span class="descriptor">Abstract:</span>
        We revisit compressed permutation oracles in quantum query complexity, demonstrating optimal bounds
        for quantum algorithms against quantum random permutation models under non-adaptive and adaptive access.
      </blockquote>
      <div class="current">
        <span class="primary-subject">Quantum Physics (quant-ph)</span>; Cryptography and Security (cs.CR)
      </div>
    </body>
    </html>
  `;

  test("Scrapes exact user screenshot: Quantum Physics, [Submitted on 23 Sep 2026], Compressed Permutation Oracles Revisited", () => {
    const scraped = parseArxivAbstractHtml(sampleUserScreenshotHtml, "2609.26123");

    // 1. Category extraction
    assert.strictEqual(scraped.category, "Quantum Physics");
    assert.strictEqual(scraped.categoryCode, "quant-ph");
    assert.strictEqual(scraped.isQuantumPhysicsOrOptics, true);

    // 2. Dateline extraction located below category and above title
    assert.strictEqual(scraped.rawDateline, "[Submitted on 23 Sep 2026]");
    assert.strictEqual(scraped.submittedDateStr, "23 Sep 2026");
    assert.strictEqual(scraped.canonicalDate, "September 23, 2026");
    assert.strictEqual(scraped.isoDate, "2026-09-23");
    assert.strictEqual(scraped.day, 23);
    assert.strictEqual(scraped.month, "September");
    assert.strictEqual(scraped.monthShort, "Sep");
    assert.strictEqual(scraped.year, 2026);

    // 3. Title extraction
    assert.strictEqual(scraped.title, "Compressed Permutation Oracles Revisited");

    // 4. Authors extraction
    assert.deepStrictEqual(scraped.authors, ["Joseph Carolan", "Christian Majenz"]);

    // 5. Structure validation (category above dateline, dateline above title)
    assert.strictEqual(scraped.isValidStructure, true);
  });

  test("Matches scraped candidate against target generation date: September 23, 2026", () => {
    const scraped = parseArxivAbstractHtml(sampleUserScreenshotHtml, "2609.26123");

    // Formats: canonical string, short string, ISO string, Date object
    const check1 = verifyPreprintDateMatch(scraped, "September 23, 2026", "Quantum Physics");
    assert.strictEqual(check1.matches, true);
    assert.strictEqual(check1.scrapedIso, "2026-09-23");
    assert.strictEqual(check1.targetIso, "2026-09-23");

    const check2 = verifyPreprintDateMatch(scraped, "23 Sep 2026");
    assert.strictEqual(check2.matches, true);

    const check3 = verifyPreprintDateMatch(scraped, "2026-09-23");
    assert.strictEqual(check3.matches, true);

    const check4 = verifyPreprintDateMatch(scraped, new Date(Date.UTC(2026, 8, 23, 8, 0, 0)));
    assert.strictEqual(check4.matches, true);
  });

  // Test Case 2: Optics preprint test case
  const sampleOpticsHtml = `
    <!DOCTYPE html>
    <html>
    <body>
      <div class="header-breadcrumbs">
        <h2>Optics</h2>
      </div>
      <div class="dateline">[Submitted on 24 Sep 2026]</div>
      <h1 class="title mathjax"><span class="descriptor">Title:</span>Strong coupling of a reconfigurable 171Yb atom array to a tunable telecom-band nanofiber cavity</h1>
      <div class="authors">
        <span class="descriptor">Authors:</span>
        <a href="/author1">H. Zhang</a>, <a href="/author2">K. Thompson</a>
      </div>
      <div class="current">
        <span class="primary-subject">Optics (physics.optics)</span>; Quantum Physics (quant-ph)
      </div>
    </body>
    </html>
  `;

  test("Scrapes Optics candidate: Optics, [Submitted on 24 Sep 2026]", () => {
    const scraped = parseArxivAbstractHtml(sampleOpticsHtml, "2609.25232");
    assert.strictEqual(scraped.category, "Optics");
    assert.strictEqual(scraped.categoryCode, "physics.optics");
    assert.strictEqual(scraped.rawDateline, "[Submitted on 24 Sep 2026]");
    assert.strictEqual(scraped.isoDate, "2026-09-24");
    assert.strictEqual(scraped.canonicalDate, "September 24, 2026");
    assert.strictEqual(scraped.title, "Strong coupling of a reconfigurable 171Yb atom array to a tunable telecom-band nanofiber cavity");

    const matchOptics = verifyPreprintDateMatch(scraped, "September 24, 2026", "Optics");
    assert.strictEqual(matchOptics.matches, true);
  });

  // Test Case 3: Rejection of candidate with mismatched date
  test("Rejects candidates whose arXiv submission date does NOT match target generation date", () => {
    const oldPaperHtml = `
      <div class="header-breadcrumbs"><h2>Quantum Physics</h2></div>
      <div class="dateline">[Submitted on 8 Sep 2026]</div>
      <h1 class="title">Dynamic Chirality in Photonic Time Crystals</h1>
    `;
    const scraped = parseArxivAbstractHtml(oldPaperHtml, "2609.08748");

    // Attempting to select this for today (September 23, 2026) must be rejected
    const verification = verifyPreprintDateMatch(scraped, "September 23, 2026");
    assert.strictEqual(verification.matches, false);
    assert.ok(verification.rejectionReason!.includes("does not match target date"));
    assert.ok(verification.rejectionReason!.includes("08 Sep 2026") || verification.rejectionReason!.includes("8 Sep 2026"));
  });

  // Test Case 4: Rejection of candidates outside Quantum Physics and Optics
  test("Rejects candidates belonging to unapproved categories (e.g. Computer Science / Math without quant-ph / optics)", () => {
    const csPaperHtml = `
      <div class="header-breadcrumbs"><h2>Computer Science</h2></div>
      <div class="dateline">[Submitted on 23 Sep 2026]</div>
      <h1 class="title">Generic Database Scaling Algorithms</h1>
      <div class="current"><span class="primary-subject">Databases (cs.DB)</span></div>
    `;
    const scraped = parseArxivAbstractHtml(csPaperHtml, "2609.99999");
    assert.strictEqual(scraped.isQuantumPhysicsOrOptics, false);

    const verification = verifyPreprintDateMatch(scraped, "September 23, 2026");
    assert.strictEqual(verification.matches, false);
    assert.ok(verification.rejectionReason!.includes("does not match required discipline"));
  });

  // Test Case 5: Parsing revision datelines (e.g., v1 with later revisions)
  test("Parses arXiv datelines with version revision notes correctly", () => {
    const revisedHtml = `
      <div class="header-breadcrumbs"><h2>Quantum Physics</h2></div>
      <div class="dateline">[Submitted on 23 Sep 2026 (v1), last revised 24 Sep 2026 (this version, v2)]</div>
      <h1 class="title">Non-Hermitian Topology in Driven Lattices</h1>
    `;
    const scraped = parseArxivAbstractHtml(revisedHtml, "2609.26999");
    assert.strictEqual(scraped.submittedDateStr, "23 Sep 2026");
    assert.strictEqual(scraped.isoDate, "2026-09-23");
    assert.strictEqual(scraped.canonicalDate, "September 23, 2026");
  });

  // Test Case 6: Candidate deck scraping and filtering
  test("scrapeAndFilterCandidatesByDate filters deck to ONLY candidate matching target date", async () => {
    const candidates = [
      { id: "2609.08748", title: "Dynamic Chirality", link: "https://arxiv.org/abs/2609.08748" }, // 8 Sep 2026
      { id: "2609.15200", title: "Subwavelength Exceptional Points", link: "https://arxiv.org/abs/2609.15200" }, // 21 Sep 2026
      { id: "2609.24017", title: "Square-Root Higher-Order EPs", link: "https://arxiv.org/abs/2609.24017" }, // 22 Sep 2026
      { id: "2609.26123", title: "Compressed Permutation Oracles", link: "https://arxiv.org/abs/2609.26123" }, // 23 Sep 2026 (MATCH)
      { id: "2609.25232", title: "Strong Coupling Yb Array", link: "https://arxiv.org/abs/2609.25232" }, // 24 Sep 2026
    ];

    const customHtmlMap: Record<string, string> = {
      "2609.08748": `<div class="header-breadcrumbs"><h2>Quantum Physics</h2></div><div class="dateline">[Submitted on 8 Sep 2026]</div><h1 class="title">Dynamic Chirality</h1>`,
      "2609.15200": `<div class="header-breadcrumbs"><h2>Optics</h2></div><div class="dateline">[Submitted on 21 Sep 2026]</div><h1 class="title">Subwavelength Exceptional Points</h1>`,
      "2609.24017": `<div class="header-breadcrumbs"><h2>Quantum Physics</h2></div><div class="dateline">[Submitted on 22 Sep 2026]</div><h1 class="title">Square-Root Higher-Order EPs</h1>`,
      "2609.26123": sampleUserScreenshotHtml, // 23 Sep 2026
      "2609.25232": sampleOpticsHtml, // 24 Sep 2026
    };

    const result = await scrapeAndFilterCandidatesByDate(candidates, "September 23, 2026", {
      customHtmlMap
    });

    // Exactly 1 valid candidate matching today's target date
    assert.strictEqual(result.validCandidates.length, 1);
    assert.strictEqual(result.validCandidates[0].id, "2609.26123");
    assert.strictEqual(result.validCandidates[0].scrapedPage.category, "Quantum Physics");
    assert.strictEqual(result.validCandidates[0].scrapedPage.submittedDateStr, "23 Sep 2026");

    // 4 rejected candidates with clear diagnosis
    assert.strictEqual(result.rejectedCandidates.length, 4);
    assert.ok(result.rejectedCandidates.some(r => r.candidate.id === "2609.08748" && (r.reason.includes("8 Sep 2026") || r.reason.includes("08 Sep 2026"))));
    assert.ok(result.rejectedCandidates.some(r => r.candidate.id === "2609.25232" && r.reason.includes("24 Sep 2026")));
  });

  // Test Case 7: URL and identifier parser resilience
  test("extractArxivIdFromInput normalizes various arXiv URL formats", () => {
    assert.strictEqual(extractArxivIdFromInput("https://arxiv.org/abs/2609.26123"), "2609.26123");
    assert.strictEqual(extractArxivIdFromInput("https://arxiv.org/pdf/2609.26123.pdf"), "2609.26123");
    assert.strictEqual(extractArxivIdFromInput("http://arxiv.org/abs/2609.26123v2"), "2609.26123");
    assert.strictEqual(extractArxivIdFromInput("2609.26123"), "2609.26123");
    assert.strictEqual(extractArxivIdFromInput("arxiv:2609.26123v1"), "2609.26123");
  });

  // Test Case 8: Date Normalizer
  test("normalizeDateToIso accurately standardizes various date representations", () => {
    const r1 = normalizeDateToIso("23 Sep 2026");
    assert.strictEqual(r1.isoDate, "2026-09-23");
    assert.strictEqual(r1.canonicalDate, "September 23, 2026");

    const r2 = normalizeDateToIso("[Submitted on 23 Sep 2026]");
    assert.strictEqual(r2.isoDate, "2026-09-23");

    const r3 = normalizeDateToIso("September 23, 2026");
    assert.strictEqual(r3.isoDate, "2026-09-23");

    const r4 = normalizeDateToIso("2026-09-23");
    assert.strictEqual(r4.isoDate, "2026-09-23");
  });
});
