import test from "node:test";
import assert from "node:assert";
import {
  toggleBookmark,
  isBookmarked,
  filterBookmarkedPosts,
  calculateTotalBookmarkReadingTime,
  exportBookmarksJSON
} from "./bookmarkUtils";
import {
  calculateEngagementScore,
  getPopularityTier,
  computePostAnalytics
} from "./articleAnalytics";
import {
  formatViews,
  calculateBaseViews,
  calculateActiveReaders,
  calculateViewVelocity
} from "./viewCounter";
import { BlogPost } from "../types";

const mockLibrary: BlogPost[] = [
  {
    id: "art-1",
    title: "Quantum Simulation of Lattice Gauge Theories",
    slug: "quantum-simulation-lattice-gauge-theories",
    excerpt: "Simulating U(1) gauge fields in Rydberg atom arrays.",
    content: "Rydberg atom arrays provide programmable quantum simulators for strongly correlated matter.",
    tags: ["Quantum Simulation", "Rydberg Atoms"],
    author: "Lucas Kempe",
    date: "2026-08-01T00:00:00Z",
    readingTime: "12 min read",
    arxivLink: "https://arxiv.org/abs/2608.1111",
    bannerSvg: "<svg></svg>",
    views: 4500
  },
  {
    id: "art-2",
    title: "High-Q Photonic Crystal Nanocavities",
    slug: "high-q-photonic-crystal-nanocavities",
    excerpt: "Ultra-small mode volumes in silicon nitride membranes.",
    content: "Cavity quantum electrodynamics requires ultra-high quality factors exceeding 10^6.",
    tags: ["Photonics", "Nanotechnology"],
    author: "Elena Vance",
    date: "2026-08-10T00:00:00Z",
    readingTime: "6 min read",
    arxivLink: "https://arxiv.org/abs/2608.2222",
    bannerSvg: "<svg></svg>",
    views: 1200
  }
];

test("Bookmark Utility: toggles post IDs accurately in bookmark collection", () => {
  let bookmarks: string[] = [];
  
  // Add first
  bookmarks = toggleBookmark(bookmarks, "art-1");
  assert.deepStrictEqual(bookmarks, ["art-1"]);
  assert.strictEqual(isBookmarked(bookmarks, "art-1"), true);
  assert.strictEqual(isBookmarked(bookmarks, "art-2"), false);

  // Add second
  bookmarks = toggleBookmark(bookmarks, "art-2");
  assert.deepStrictEqual(bookmarks, ["art-1", "art-2"]);

  // Toggle off first
  bookmarks = toggleBookmark(bookmarks, "art-1");
  assert.deepStrictEqual(bookmarks, ["art-2"]);
  assert.strictEqual(isBookmarked(bookmarks, "art-1"), false);
});

test("Bookmark Utility: calculates aggregated reading time in minutes", () => {
  const saved = filterBookmarkedPosts(mockLibrary, ["art-1", "art-2"]);
  assert.strictEqual(saved.length, 2);

  const totalMins = calculateTotalBookmarkReadingTime(saved);
  assert.strictEqual(totalMins, 18); // 12 + 6 = 18 minutes
});

test("Bookmark Export: formats clean JSON backup structure", () => {
  const jsonString = exportBookmarksJSON(mockLibrary, ["art-1"]);
  const parsed = JSON.parse(jsonString);

  assert.strictEqual(parsed.count, 1);
  assert.strictEqual(parsed.bookmarks[0].id, "art-1");
  assert.strictEqual(parsed.bookmarks[0].title, "Quantum Simulation of Lattice Gauge Theories");
  assert.ok(parsed.exportedAt);
});

test("Article Analytics & Velocity Mathematics: verifies scoring tier distribution", () => {
  const post = mockLibrary[0];
  const analytics = computePostAnalytics(post, 4500, 15);

  assert.ok(analytics.engagementScore > 500);
  assert.strictEqual(analytics.popularityTier, "Trending");
});

test("View Counter Formatter: converts raw counts to international format strings", () => {
  assert.strictEqual(formatViews(450), "450");
  assert.strictEqual(formatViews(1200), "1,200");
  assert.strictEqual(formatViews(25000), "25k");
  assert.strictEqual(formatViews(1500000), "1.5M");
});

test("Real-time Active Readers: generates bounded non-zero reader count", () => {
  const readers1 = calculateActiveReaders("art-1", 4500);
  const readers2 = calculateActiveReaders("art-2", 1200);

  assert.ok(readers1 >= 2 && readers1 <= 20);
  assert.ok(readers2 >= 2 && readers2 <= 20);
});
