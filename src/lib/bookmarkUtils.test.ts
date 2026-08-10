import test from "node:test";
import assert from "node:assert";
import {
  toggleBookmark,
  isBookmarked,
  filterBookmarkedPosts,
  calculateTotalBookmarkReadingTime,
  exportBookmarksJSON
} from "./bookmarkUtils.js";
import { BlogPost } from "../types.js";

const post1: BlogPost = {
  id: "b1",
  title: "Superconducting Qubits",
  slug: "superconducting-qubits",
  excerpt: "Circuit QED systems.",
  content: "Content...",
  date: "July 10, 2026",
  readingTime: "6 min read",
  arxivLink: "https://arxiv.org/abs/2607.001",
  bannerSvg: "<svg></svg>",
  author: "Dr. Sam Carter",
  tags: ["Quantum"]
};

const post2: BlogPost = {
  id: "b2",
  title: "Optical Tweezers in Biophysics",
  slug: "optical-tweezers-biophysics",
  excerpt: "Single molecule mechanics.",
  content: "Content...",
  date: "July 12, 2026",
  readingTime: "12 min read",
  arxivLink: "https://arxiv.org/abs/2607.002",
  bannerSvg: "<svg></svg>",
  author: "Dr. Sam Carter",
  tags: ["Biophysics"]
};

test("toggleBookmark handles invalid or empty target IDs gracefully", () => {
  const initial = ["b1"];
  assert.deepStrictEqual(toggleBookmark(initial, ""), ["b1"]);
  assert.deepStrictEqual(toggleBookmark(initial, null as unknown as string), ["b1"]);
  assert.deepStrictEqual(toggleBookmark(undefined, "b2"), ["b2"]);
});

test("calculateTotalBookmarkReadingTime handles posts without reading time string", () => {
  const postNoTime: BlogPost = { ...post1, readingTime: "" };
  const postInvalidTime: BlogPost = { ...post2, readingTime: "No digits" };
  assert.strictEqual(calculateTotalBookmarkReadingTime([postNoTime, postInvalidTime]), 0);
  assert.strictEqual(calculateTotalBookmarkReadingTime(null as unknown as BlogPost[]), 0);
});

test("isBookmarked checks presence accurately", () => {
  assert.strictEqual(isBookmarked(["b1", "b2"], "b1"), true);
  assert.strictEqual(isBookmarked(["b1", "b2"], "b3"), false);
  assert.strictEqual(isBookmarked([], "b1"), false);
});

test("filterBookmarkedPosts filters matching blog post objects", () => {
  const bookmarked = filterBookmarkedPosts([post1, post2], ["b2"]);
  assert.strictEqual(bookmarked.length, 1);
  assert.strictEqual(bookmarked[0].id, "b2");
});

test("calculateTotalBookmarkReadingTime sums total read time in minutes", () => {
  const total = calculateTotalBookmarkReadingTime([post1, post2]);
  assert.strictEqual(total, 18); // 6 + 12
});

test("exportBookmarksJSON exports clean structured JSON payload", () => {
  const jsonStr = exportBookmarksJSON([post1, post2], ["b1"]);
  const parsed = JSON.parse(jsonStr);

  assert.strictEqual(parsed.count, 1);
  assert.strictEqual(parsed.bookmarks[0].id, "b1");
  assert.strictEqual(parsed.bookmarks[0].title, "Superconducting Qubits");
});
