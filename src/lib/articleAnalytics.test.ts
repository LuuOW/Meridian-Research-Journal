import test from "node:test";
import assert from "node:assert";
import {
  calculateEngagementScore,
  getPopularityTier,
  computePostAnalytics
} from "./articleAnalytics.js";
import { BlogPost } from "../types.js";

const samplePost: BlogPost = {
  id: "analytics-1",
  title: "Waveguide Quantum Electrodynamics",
  slug: "waveguide-qed",
  excerpt: "Atomic light scattering in 1D photonic waveguides.",
  content: "Quantum optics paper content discussing photon transport through subwavelength waveguides and emitter coupling efficiency.",
  date: "August 3, 2026",
  readingTime: "4 min read",
  arxivLink: "https://arxiv.org/abs/2608.30303",
  bannerSvg: "<svg></svg>",
  author: "Dr. Clara Oswald",
  tags: ["Quantum Optics", "Photonics"]
};

test("calculateEngagementScore weighs views, bookmarks, and read time correctly", () => {
  // views: 100 * 0.4 = 40, bookmarks: 10 * 15 = 150, depth: 5 * 2 = 10 -> total = 200
  const score = calculateEngagementScore(100, 10, 5);
  assert.strictEqual(score, 200);

  // Handles negative values safely
  const safeScore = calculateEngagementScore(-50, -5, -2);
  assert.strictEqual(safeScore, 2);
});

test("getPopularityTier classifies scores into expected tiers", () => {
  assert.strictEqual(getPopularityTier(500), "Trending", "500 is exact threshold for Trending");
  assert.strictEqual(getPopularityTier(499), "High", "499 is upper bound for High");
  assert.strictEqual(getPopularityTier(250), "High", "250 is exact threshold for High");
  assert.strictEqual(getPopularityTier(249), "Medium", "249 is upper bound for Medium");
  assert.strictEqual(getPopularityTier(100), "Medium", "100 is exact threshold for Medium");
  assert.strictEqual(getPopularityTier(99), "Low", "99 is upper bound for Low");
  assert.strictEqual(getPopularityTier(0), "Low");
});

test("calculateEngagementScore uses sensible defaults when omitted", () => {
  // views default 0 -> 0, bookmarks default 0 -> 0, readingTime default 5 -> 10 => total = 10
  const defaultScore = calculateEngagementScore();
  assert.strictEqual(defaultScore, 10);
});

test("computePostAnalytics computes full analytics breakdown", () => {
  const analytics = computePostAnalytics(samplePost, 400, 25);

  assert.strictEqual(analytics.postId, "analytics-1");
  assert.ok(analytics.wordCount > 10);
  assert.ok(analytics.estimatedReadTimeMinutes >= 1);
  assert.ok(analytics.engagementScore > 300);
  assert.strictEqual(analytics.popularityTier, "Trending");
});

test("computePostAnalytics handles empty post objects safely", () => {
  const analytics = computePostAnalytics(null as unknown as BlogPost);

  assert.strictEqual(analytics.postId, "unknown");
  assert.strictEqual(analytics.wordCount, 0);
  assert.strictEqual(analytics.estimatedReadTimeMinutes, 1);
  assert.ok(typeof analytics.engagementScore === "number");
});
