import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import {
  extractSubmissionDateFromText,
  syncArticleDates,
  auditAndSynchronizeAllArticles,
  formatCanonicalDate
} from "./dateGenerationSync";
import { BlogPost } from "../types";
import { PRELOADED_BLOGS } from "../data";

test("extractSubmissionDateFromText: correctly extracts and parses arXiv submission strings", () => {
  // Test case 1: user specification [Submitted on 21 Sep 2026]
  const sample1 = "arXiv:2609.15200v1 [physics.optics] [Submitted on 21 Sep 2026]";
  const result1 = extractSubmissionDateFromText(sample1);
  assert.ok(result1 !== null, "Must extract date from sample 1");
  assert.strictEqual(result1.formattedFull, "September 21, 2026");
  assert.strictEqual(result1.formattedShort, "Sep 21, 2026");
  assert.strictEqual(result1.isoDate, "2026-09-21");
  assert.strictEqual(new Date(result1.timestamp).toISOString().slice(0, 10), "2026-09-21");

  // Test case 2: user prompt [Submitted on 8 Sep 2026]
  const sample2 = "Dynamic Chirality in Photonic Time Crystals [Submitted on 8 Sep 2026]";
  const result2 = extractSubmissionDateFromText(sample2);
  assert.ok(result2 !== null, "Must extract date from sample 2");
  assert.strictEqual(result2.formattedFull, "September 8, 2026");
  assert.strictEqual(result2.formattedShort, "Sep 8, 2026");
  assert.strictEqual(result2.isoDate, "2026-09-08");

  // Test case 3: Full month format
  const sample3 = "Paper title [Submitted on September 24, 2026]";
  const result3 = extractSubmissionDateFromText(sample3);
  assert.ok(result3 !== null, "Must extract date from sample 3");
  assert.strictEqual(result3.formattedFull, "September 24, 2026");
  assert.strictEqual(result3.isoDate, "2026-09-24");

  // Test case 4: Announced format
  const sample4 = "- **Preprint**: [arXiv:2609.26674] (Announced: September 23, 2026)";
  const result4 = extractSubmissionDateFromText(sample4);
  assert.ok(result4 !== null, "Must extract date from sample 4");
  assert.strictEqual(result4.formattedFull, "September 23, 2026");
  assert.strictEqual(result4.isoDate, "2026-09-23");

  // Test case 5: Edge cases
  assert.strictEqual(extractSubmissionDateFromText(null), null);
  assert.strictEqual(extractSubmissionDateFromText(""), null);
  assert.strictEqual(extractSubmissionDateFromText("No date string here"), null);
});

test("syncArticleDates: matches article date and generation timestamp to arXiv submission date", () => {
  const dummyArticle: BlogPost = {
    id: "test-blog-sub-21",
    title: "Subwavelength exceptional points in dispersive resonator arrays",
    slug: "subwavelength-exceptional-points",
    excerpt: "Analysis of preprint",
    content: "Content with [Submitted on 21 Sep 2026] in abstract block.",
    readingTime: "6 min read",
    author: "Researcher",
    arxivLink: "https://arxiv.org/abs/2609.15200",
    tags: ["Optics"],
    bannerSvg: "<svg></svg>",
    date: "September 24, 2026" // Mismatched generation date
  };

  // Synchronize with arXiv submission date
  const synced = syncArticleDates(dummyArticle, { arxivSubmissionDate: "[Submitted on 21 Sep 2026]" });

  assert.strictEqual(synced.date, "September 21, 2026", "Article date must match submission date");
  assert.strictEqual(
    new Date(synced.timestamp!).toISOString().slice(0, 10),
    "2026-09-21",
    "Timestamp must match submission date (2026-09-21)"
  );
  assert.strictEqual(
    new Date(synced.createdAt!).toISOString().slice(0, 10),
    "2026-09-21",
    "CreatedAt must match submission date (2026-09-21)"
  );
  assert.ok(synced.views! >= 320, "Views must be >= 320");
});

test("formatCanonicalDate formats Date objects accurately", () => {
  const d = new Date("2026-09-21T12:00:00Z");
  assert.strictEqual(formatCanonicalDate(d), "September 21, 2026");
  assert.strictEqual(formatCanonicalDate(d, true), "Sep 21, 2026");
});

test("Full Corpus Review: ALL articles in database have a date that matches their generation date", () => {
  const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
  const blogs: BlogPost[] = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));

  assert.ok(blogs.length >= 60, "Corpus must have substantial article count");

  const { articles: verifiedArticles, report } = auditAndSynchronizeAllArticles(blogs);

  assert.strictEqual(verifiedArticles.length, blogs.length);

  for (const [idx, b] of verifiedArticles.entries()) {
    // 1. Article must have a non-empty date
    assert.ok(b.date && b.date.trim().length > 0, `Article [${idx}] ${b.id} missing date`);

    // 2. Article must have valid numeric timestamp and createdAt
    assert.ok(typeof b.timestamp === "number" && !isNaN(b.timestamp), `Article [${idx}] ${b.id} missing timestamp`);
    assert.ok(typeof b.createdAt === "number" && !isNaN(b.createdAt), `Article [${idx}] ${b.id} missing createdAt`);

    // 3. Date string and timestamp must point to the EXACT same calendar day (YYYY-MM-DD)
    const dateParsed = new Date(b.date);
    assert.ok(!isNaN(dateParsed.getTime()), `Article [${idx}] ${b.id} has unparseable date "${b.date}"`);

    const dateDay = dateParsed.toISOString().slice(0, 10);
    const tsDay = new Date(b.timestamp).toISOString().slice(0, 10);
    const crDay = new Date(b.createdAt).toISOString().slice(0, 10);

    assert.strictEqual(
      tsDay,
      dateDay,
      `Article "${b.id}" generation timestamp (${tsDay}) MUST match publication date (${dateDay})`
    );
    assert.strictEqual(
      crDay,
      dateDay,
      `Article "${b.id}" createdAt timestamp (${crDay}) MUST match publication date (${dateDay})`
    );
  }
});
