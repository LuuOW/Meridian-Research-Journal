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
  assert.strictEqual(getPopularityTier(600), "Trending");
  assert.strictEqual(getPopularityTier(300), "High");
  assert.strictEqual(getPopularityTier(150), "Medium");
  assert.strictEqual(getPopularityTier(20), "Low");
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
