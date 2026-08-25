import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";
import {
  formatViews,
  calculateBaseViews,
  calculateActiveReaders,
  parsePublicationDate,
  isChronologicallyValidDate,
  calculateDaysSincePublication,
  formatRelativePublicationDate,
  calculateViewVelocity,
  sortBlogsByPublicationDate,
  filterBlogsByDateRange,
} from "./viewCounter";
import {
  calculateEngagementScore,
  getPopularityTier,
  computePostAnalytics,
} from "./articleAnalytics";

test("Publication Date Parsing properly parses standard dates and safely rejects invalid formats", () => {
  // Valid publication dates
  const d1 = parsePublicationDate("August 21, 2026");
  assert.ok(d1 instanceof Date && !isNaN(d1.getTime()), "Valid US date string must parse to Date");
  assert.strictEqual(d1.getFullYear(), 2026);
  assert.strictEqual(d1.getMonth(), 7); // August is index 7

  const d2 = parsePublicationDate("2026-06-14T00:00:00.000Z");
  assert.ok(d2 instanceof Date && !isNaN(d2.getTime()));
  assert.strictEqual(d2.getUTCFullYear(), 2026);
  assert.strictEqual(d2.getUTCMonth(), 5); // June is index 5
  assert.strictEqual(d2.getUTCDate(), 14);

  // Invalid formats
  assert.strictEqual(parsePublicationDate(null), null);
  assert.strictEqual(parsePublicationDate(undefined), null);
  assert.strictEqual(parsePublicationDate(""), null);
  assert.strictEqual(parsePublicationDate("   "), null);
  assert.strictEqual(parsePublicationDate("invalid-non-date-string"), null);

  // Chronological validity
  assert.strictEqual(isChronologicallyValidDate("August 21, 2026"), true);
  assert.strictEqual(isChronologicallyValidDate("May 4, 2026"), true);
  assert.strictEqual(isChronologicallyValidDate("January 1, 2024"), true);
  assert.strictEqual(isChronologicallyValidDate("January 1, 1990"), false, "Year 1990 is outside expected bounds");
  assert.strictEqual(isChronologicallyValidDate("January 1, 2045"), false, "Year 2045 is outside expected bounds");
  assert.strictEqual(isChronologicallyValidDate("gibberish"), false);
});

test("Date Delta Mathematics accurately calculates elapsed days and relative time formatting", () => {
  const refDate = new Date("2026-08-24T12:00:00Z");

  // Same day
  assert.strictEqual(calculateDaysSincePublication("2026-08-24T08:00:00Z", refDate), 0);
  assert.strictEqual(formatRelativePublicationDate("2026-08-24T08:00:00Z", refDate), "Today");

  // 1 day ago
  assert.strictEqual(calculateDaysSincePublication("2026-08-23T12:00:00Z", refDate), 1);
  assert.strictEqual(formatRelativePublicationDate("2026-08-23T12:00:00Z", refDate), "Yesterday");

  // 3 days ago (e.g. Aug 21, 2026)
  assert.strictEqual(calculateDaysSincePublication("2026-08-21T12:00:00Z", refDate), 3);
  assert.strictEqual(formatRelativePublicationDate("2026-08-21T12:00:00Z", refDate), "3 days ago");

  // 1 week ago (7 to 13 days)
  assert.strictEqual(calculateDaysSincePublication("2026-08-16T12:00:00Z", refDate), 8);
  assert.strictEqual(formatRelativePublicationDate("2026-08-16T12:00:00Z", refDate), "1 week ago");

  // Multiple weeks ago (e.g. 20 days ago)
  assert.strictEqual(calculateDaysSincePublication("2026-08-04T12:00:00Z", refDate), 20);
  assert.strictEqual(formatRelativePublicationDate("2026-08-04T12:00:00Z", refDate), "2 weeks ago");

  // 1 month ago (30 to 59 days)
  assert.strictEqual(calculateDaysSincePublication("2026-07-10T12:00:00Z", refDate), 45);
  assert.strictEqual(formatRelativePublicationDate("2026-07-10T12:00:00Z", refDate), "1 month ago");

  // Multiple months ago (e.g. May 4, 2026 -> ~112 days ago)
  const mayDays = calculateDaysSincePublication("2026-05-04T12:00:00Z", refDate);
  assert.strictEqual(mayDays, 112);
  assert.strictEqual(formatRelativePublicationDate("2026-05-04T12:00:00Z", refDate), "3 months ago");

  // Future date safety (returns 0 and Today)
  assert.strictEqual(calculateDaysSincePublication("2026-08-30T12:00:00Z", refDate), 0);
  assert.strictEqual(formatRelativePublicationDate("2026-08-30T12:00:00Z", refDate), "Today");
});

test("Chronological sorting and date range filtering mathematics", () => {
  const sampleBlogs: BlogPost[] = [
    { id: "b1", title: "Oldest", date: "May 4, 2026", views: 400 } as BlogPost,
    { id: "b2", title: "Middle", date: "June 25, 2026", views: 600 } as BlogPost,
    { id: "b3", title: "Newest", date: "August 22, 2026", views: 800 } as BlogPost,
  ];

  // Descending (newest first)
  const sortedDesc = sortBlogsByPublicationDate(sampleBlogs, "desc");
  assert.strictEqual(sortedDesc[0]?.id, "b3");
  assert.strictEqual(sortedDesc[1]?.id, "b2");
  assert.strictEqual(sortedDesc[2]?.id, "b1");

  // Ascending (oldest first)
  const sortedAsc = sortBlogsByPublicationDate(sampleBlogs, "asc");
  assert.strictEqual(sortedAsc[0]?.id, "b1");
  assert.strictEqual(sortedAsc[1]?.id, "b2");
  assert.strictEqual(sortedAsc[2]?.id, "b3");

  // Range filtering
  const juneOnly = filterBlogsByDateRange(sampleBlogs, "June 1, 2026", "June 30, 2026");
  assert.strictEqual(juneOnly.length, 1);
  assert.strictEqual(juneOnly[0]?.id, "b2");
});

test("View Counter formatting mathematics correctly handles all orders of magnitude", () => {
  // Invalid and 0
  assert.strictEqual(formatViews(0), "0");
  assert.strictEqual(formatViews(-25), "0");
  assert.strictEqual(formatViews(NaN), "0");

  // Hundreds
  assert.strictEqual(formatViews(450), "450");
  assert.strictEqual(formatViews(999), "999");

  // Thousands with comma (1,000 to 9,999)
  assert.strictEqual(formatViews(1000), "1,000");
  assert.strictEqual(formatViews(1284), "1,284");
  assert.strictEqual(formatViews(9999), "9,999");

  // Ten thousands and up with 'k'
  assert.strictEqual(formatViews(10000), "10k");
  assert.strictEqual(formatViews(15400), "15.4k");
  assert.strictEqual(formatViews(250000), "250k");
  assert.strictEqual(formatViews(999900), "999.9k");

  // Millions with 'M'
  assert.strictEqual(formatViews(1000000), "1M");
  assert.strictEqual(formatViews(2500000), "2.5M");
  assert.strictEqual(formatViews(14200000), "14.2M");
});

test("Deterministic Base Views calculation strictly satisfies mathematical bounds [320, 1850]", () => {
  const idsToTest = [
    "quantum-split-step-fourier",
    "editorial-frontier-photonic-engines-8842",
    "chiral-waveguide-arrays",
    "home-edna-sequencing-dgx-spark",
    "production-mcp-server-cloudflare-workers",
    "cloudflare-ai-gateway-vectorize-rag",
    "article-123-abc-xyz",
    "custom-synthetic-paper-key",
  ];

  for (const id of idsToTest) {
    const v1 = calculateBaseViews(id);
    const v2 = calculateBaseViews(id);
    assert.strictEqual(v1, v2, `Base view calculation for "${id}" must be strictly deterministic`);
    assert.ok(
      v1 >= 320 && v1 <= 1850,
      `Calculated view ${v1} for "${id}" must be within range [320, 1850]`
    );
    assert.strictEqual(Number.isInteger(v1), true, "Views must be integer");
  }

  // Edge cases
  assert.strictEqual(calculateBaseViews(""), 100);
  assert.strictEqual(calculateBaseViews(null as any), 100);
  assert.strictEqual(calculateBaseViews(undefined as any), 100);
});

test("Active Readers estimation adheres to mathematical bounds [2, 18]", () => {
  const sampleArticleId = "quantum-split-step-fourier-nonlinear-optical-waveguides";
  for (let view = 0; view < 100; view += 7) {
    const readers = calculateActiveReaders(sampleArticleId, view);
    assert.ok(
      readers >= 2 && readers <= 18,
      `Active readers count (${readers}) must be within [2, 18]`
    );
    assert.strictEqual(Number.isInteger(readers), true);
  }
});

test("View Velocity & Engagement Score mathematical models", () => {
  const refDate = new Date("2026-08-24T12:00:00Z");

  // Velocity math: 1000 views over 10 days = 100 views/day
  const velocity1 = calculateViewVelocity(1000, "2026-08-14T12:00:00Z", refDate);
  assert.strictEqual(velocity1, 100);

  // Velocity math: 350 views over 7 days = 50 views/day
  const velocity2 = calculateViewVelocity(350, "2026-08-17T12:00:00Z", refDate);
  assert.strictEqual(velocity2, 50);

  // Engagement score math: 0.4 * views + 15 * bookmarks + 2 * readingTimeMinutes
  // 500 views * 0.4 = 200, 10 bookmarks * 15 = 150, 5 min * 2 = 10 -> sum = 360
  const score1 = calculateEngagementScore(500, 10, 5);
  assert.strictEqual(score1, 360);
  assert.strictEqual(getPopularityTier(score1), "High");

  // High engagement -> Trending
  const scoreTrending = calculateEngagementScore(1200, 20, 8); // 480 + 300 + 16 = 796
  assert.strictEqual(scoreTrending, 796);
  assert.strictEqual(getPopularityTier(scoreTrending), "Trending");

  // Low engagement
  const scoreLow = calculateEngagementScore(100, 1, 3); // 40 + 15 + 6 = 61
  assert.strictEqual(scoreLow, 61);
  assert.strictEqual(getPopularityTier(scoreLow), "Low");
});

test("Exhaustive audit: All 64 articles across PRELOADED_BLOGS and custom_blogs.json have valid dates and view metrics", () => {
  const customDataRaw = fs.readFileSync("custom_blogs.json", "utf8");
  const customBlogs: BlogPost[] = JSON.parse(customDataRaw);

  assert.ok(PRELOADED_BLOGS.length >= 64, "PRELOADED_BLOGS must contain all articles");
  assert.strictEqual(PRELOADED_BLOGS.length, customBlogs.length, "PRELOADED_BLOGS and custom_blogs.json must have matching counts");

  // Verify PRELOADED_BLOGS
  for (const [idx, b] of PRELOADED_BLOGS.entries()) {
    assert.ok(b.id && b.id.trim().length > 0, `Article at index ${idx} must have non-empty id`);
    assert.ok(b.title && b.title.trim().length > 0, `Article "${b.id}" must have non-empty title`);
    assert.ok(b.date && b.date.trim().length > 0, `Article "${b.id}" must have date`);

    const parsedDate = parsePublicationDate(b.date);
    assert.ok(
      parsedDate instanceof Date && !isNaN(parsedDate.getTime()),
      `Article "${b.id}" has invalid publication date: "${b.date}"`
    );
    assert.strictEqual(
      parsedDate.getFullYear(),
      2026,
      `Article "${b.id}" publication year should be 2026 (was ${parsedDate.getFullYear()})`
    );

    const views = b.views ?? calculateBaseViews(b.id);
    assert.ok(
      typeof views === "number" && !isNaN(views) && views >= 320,
      `Article "${b.id}" must have valid positive integer views >= 320 (found ${views})`
    );
  }

  // Verify custom_blogs.json matches exactly
  for (const [idx, b] of customBlogs.entries()) {
    const parsedDate = parsePublicationDate(b.date);
    assert.ok(parsedDate instanceof Date && !isNaN(parsedDate.getTime()));
    assert.strictEqual(parsedDate.getFullYear(), 2026);
    const views = b.views ?? calculateBaseViews(b.id);
    assert.ok(typeof views === "number" && views >= 320);
  }
});
