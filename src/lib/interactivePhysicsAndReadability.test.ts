import test from "node:test";
import assert from "node:assert";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState
} from "./rayTracingUtils.js";
import {
  countSyllables,
  calculateFleschKincaidScore,
  analyzeTextMetrics
} from "./readability.js";
import {
  toggleBookmark,
  isBookmarked,
  filterBookmarkedPosts,
  calculateTotalBookmarkReadingTime,
  exportBookmarksJSON
} from "./bookmarkUtils.js";
import { BlogPost } from "../types.js";

// ==========================================
// 1. Ray-Tracing & Optical Physics Tests
// ==========================================

test("calculateNormalizedCursor normalizes cursor to [-1, 1] relative to center", () => {
  const rect = { left: 100, top: 100, width: 200, height: 100 };

  // Exact center (200, 150) -> normX = 0, normY = 0
  const center = calculateNormalizedCursor(200, 150, rect);
  assert.strictEqual(center.normX, 0);
  assert.strictEqual(center.normY, 0);

  // Top-left corner (100, 100) -> normX = -1, normY = -1
  const topLeft = calculateNormalizedCursor(100, 100, rect);
  assert.strictEqual(topLeft.normX, -1);
  assert.strictEqual(topLeft.normY, -1);

  // Bottom-right corner (300, 200) -> normX = 1, normY = 1
  const bottomRight = calculateNormalizedCursor(300, 200, rect);
  assert.strictEqual(bottomRight.normX, 1);
  assert.strictEqual(bottomRight.normY, 1);

  // Out of bounds clamps strictly to [-1, 1]
  const outside = calculateNormalizedCursor(500, 0, rect);
  assert.strictEqual(outside.normX, 1);
  assert.strictEqual(outside.normY, -1);

  // Zero-dimension fallback
  const zeroRect = calculateNormalizedCursor(150, 150, { left: 0, top: 0, width: 0, height: 0 });
  assert.strictEqual(zeroRect.normX, 0);
  assert.strictEqual(zeroRect.normY, 0);
});

test("computeRayTracedLightState calculates specular angle, 3D tilt, and shadow deflection", () => {
  // Center resting point
  const centerState = computeRayTracedLightState(0, 0);
  assert.strictEqual(centerState.lightX, 50);
  assert.strictEqual(centerState.lightY, 50);
  assert.strictEqual(centerState.tiltX, 0);
  assert.strictEqual(centerState.tiltY, 0);
  assert.strictEqual(centerState.shadowX, 0);
  assert.strictEqual(centerState.shadowY, 8);

  // Top-right cursor position (normX = 1, normY = -1)
  const topRight = computeRayTracedLightState(1, -1, 5, 20);
  assert.strictEqual(topRight.lightX, 100);
  assert.strictEqual(topRight.lightY, 0);
  assert.strictEqual(topRight.tiltX, 5); // Tilts upwards towards viewer
  assert.strictEqual(topRight.tiltY, 5);
  assert.strictEqual(topRight.shadowX, -20); // Shadow projects opposite to cursor light
  assert.strictEqual(topRight.shadowY, 28);
});

test("getDefaultLightState returns stationary equilibrium values", () => {
  const def = getDefaultLightState();
  assert.strictEqual(def.lightX, 50);
  assert.strictEqual(def.lightY, 50);
  assert.strictEqual(def.angle, 45);
  assert.strictEqual(def.tiltX, 0);
  assert.strictEqual(def.tiltY, 0);
  assert.strictEqual(def.shadowX, 0);
  assert.strictEqual(def.shadowY, 12);
});

// ==========================================
// 2. Readability & Text Analysis Tests
// ==========================================

test("countSyllables accurately approximates syllables in scientific and standard vocabulary", () => {
  assert.strictEqual(countSyllables("a"), 1);
  assert.strictEqual(countSyllables("optics"), 2);
  assert.strictEqual(countSyllables("photon"), 2);
  assert.strictEqual(countSyllables("quantum"), 2);
  assert.strictEqual(countSyllables("superconducting"), 5);
  assert.strictEqual(countSyllables(""), 0);
});

test("calculateFleschKincaidScore evaluates readability index and strips formulas", () => {
  // Simple plain English
  const simpleText = "The cat sat on the mat. The dog ran fast in the sun.";
  const simpleScore = calculateFleschKincaidScore(simpleText);
  assert.ok(simpleScore.score >= 80);
  assert.ok(simpleScore.level === "Easy" || simpleScore.level === "Very Easy");

  // Dense scientific prose with math formulas
  const academicText = `We demonstrate optomechanical backaction evasion.
$$ \\hat{H}_{int} = \\hbar g_0 \\hat{a}^\\dagger \\hat{a} (\\hat{b} + \\hat{b}^\\dagger) $$
The quantum noise squashing ratio exhibits non-classical sub-Poissonian phonon statistics.`;

  const academicScore = calculateFleschKincaidScore(academicText);
  assert.ok(academicScore.score <= 60);

  // Empty string handling
  assert.strictEqual(calculateFleschKincaidScore("").score, 100);
});

test("analyzeTextMetrics generates complete text statistics breakdown", () => {
  const content = `# Introduction
This is the first paragraph with simple words.

This is the second paragraph with more technical descriptions.`;

  const metrics = analyzeTextMetrics(content);
  assert.ok(metrics.characterCount > 50);
  assert.ok(metrics.wordCount >= 14);
  assert.strictEqual(metrics.paragraphCount, 2);
  assert.ok(metrics.readabilityScore > 0);
  assert.ok(metrics.readabilityLevel.length > 0);
});

// ==========================================
// 3. Bookmark Manager & Library Persistence Tests
// ==========================================

const samplePosts: BlogPost[] = [
  {
    id: "post-1",
    title: "Quantum Entanglement Verification",
    slug: "quantum-entanglement-verification",
    excerpt: "Bell inequalities.",
    content: "Testing Bell inequalities.",
    author: "Lucas Kempe",
    date: "2026-08-18",
    readingTime: "5 min read",
    arxivLink: "https://arxiv.org/abs/2608.14468",
    tags: ["Quantum"],
    bannerSvg: "<svg></svg>"
  },
  {
    id: "post-2",
    title: "Topological Photonic Modes",
    slug: "topological-photonic-modes",
    excerpt: "Chern insulators.",
    content: "Exploring synthetic dimensions.",
    author: "Dr. Elena Vance",
    date: "2026-08-19",
    readingTime: "7 min read",
    arxivLink: "https://arxiv.org/abs/2608.16857",
    tags: ["Photonics"],
    bannerSvg: "<svg></svg>"
  }
];

test("toggleBookmark adds and removes post IDs idempotently", () => {
  let bookmarks: string[] = [];

  bookmarks = toggleBookmark(bookmarks, "post-1");
  assert.deepStrictEqual(bookmarks, ["post-1"]);

  bookmarks = toggleBookmark(bookmarks, "post-2");
  assert.deepStrictEqual(bookmarks, ["post-1", "post-2"]);

  bookmarks = toggleBookmark(bookmarks, "post-1");
  assert.deepStrictEqual(bookmarks, ["post-2"]);

  // Empty target ID returns current state unmodified
  assert.deepStrictEqual(toggleBookmark(bookmarks, ""), ["post-2"]);
});

test("isBookmarked accurately checks presence of post in bookmark list", () => {
  const bookmarks = ["post-1", "post-2"];
  assert.strictEqual(isBookmarked(bookmarks, "post-1"), true);
  assert.strictEqual(isBookmarked(bookmarks, "post-3"), false);
  assert.strictEqual(isBookmarked(bookmarks, ""), false);
});

test("filterBookmarkedPosts returns only matching BlogPost objects", () => {
  const filtered = filterBookmarkedPosts(samplePosts, ["post-2"]);
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, "post-2");
  assert.strictEqual(filtered[0].title, "Topological Photonic Modes");

  assert.deepStrictEqual(filterBookmarkedPosts([], ["post-1"]), []);
});

test("calculateTotalBookmarkReadingTime sums cumulative minutes across bookmarked articles", () => {
  const total = calculateTotalBookmarkReadingTime(samplePosts);
  // 5 min + 7 min = 12 minutes
  assert.strictEqual(total, 12);

  assert.strictEqual(calculateTotalBookmarkReadingTime([]), 0);
});

test("exportBookmarksJSON exports valid JSON backup payload", () => {
  const jsonStr = exportBookmarksJSON(samplePosts, ["post-1", "post-2"]);
  const parsed = JSON.parse(jsonStr);

  assert.strictEqual(parsed.count, 2);
  assert.ok(parsed.exportedAt !== undefined);
  assert.strictEqual(parsed.bookmarks.length, 2);
  assert.strictEqual(parsed.bookmarks[0].id, "post-1");
  assert.strictEqual(parsed.bookmarks[1].id, "post-2");
});
