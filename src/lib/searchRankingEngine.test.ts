import test from "node:test";
import assert from "node:assert";
import {
  parseAdvancedQuery,
  evaluatePostMatch,
  executeAdvancedSearch
} from "./advancedSearch.js";
import {
  highlightQueryMatches,
  generateSearchExcerpt,
  calculateQueryRelevanceScore
} from "./searchHighlight.js";
import { BlogPost } from "../types.js";

const dataset: BlogPost[] = [
  {
    id: "ds-1",
    title: "Quantum Entanglement Verification",
    slug: "quantum-entanglement-verification",
    excerpt: "Bell inequalities and quantum state tomography.",
    content: "We prove non-locality using entangled photon pairs generated via SPDC in non-linear crystals.",
    tags: ["Quantum", "Optics", "Information"],
    author: "Lucas Kempe",
    date: "2026-04-10T00:00:00Z",
    readingTime: "5 min read",
    arxivLink: "https://arxiv.org/abs/2604.0001",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "ds-2",
    title: "Topological Insulators and Chern Numbers",
    slug: "topological-insulators-chern",
    excerpt: "Condensed matter topology and edge states.",
    content: "Dirac cones and band inversions characterize two-dimensional topological insulators.",
    tags: ["Condensed Matter", "Topology"],
    author: "Elena Vance",
    date: "2025-09-12T00:00:00Z",
    readingTime: "8 min read",
    arxivLink: "https://arxiv.org/abs/2509.0002",
    bannerSvg: "<svg></svg>"
  }
];

test("parseAdvancedQuery parses negative terms, quoted phrases, and multiple field filters", () => {
  const query = 'author:"Lucas Kempe" tag:quantum year:2026 minread:4 "entangled photon" -dirac';
  const parsed = parseAdvancedQuery(query);

  assert.strictEqual(parsed.authorFilter, "Lucas Kempe");
  assert.deepStrictEqual(parsed.tagFilters, ["quantum"]);
  assert.strictEqual(parsed.yearFilter, 2026);
  assert.strictEqual(parsed.minReadTime, 4);
  assert.deepStrictEqual(parsed.exactPhrases, ["entangled photon"]);
  assert.deepStrictEqual(parsed.excludedTerms, ["dirac"]);
});

test("evaluatePostMatch scores exact phrases and negative terms correctly", () => {
  const query = parseAdvancedQuery('"entangled photon" tag:optics');
  const match1 = evaluatePostMatch(dataset[0], query);
  const match2 = evaluatePostMatch(dataset[1], query);

  assert.strictEqual(match1.matches, true);
  assert.ok(match1.score >= 50);
  assert.strictEqual(match2.matches, false);
});

test("highlightQueryMatches partitions text into matching and non-matching tokens", () => {
  const text = "Quantum physics explores quantum non-locality.";
  const chunks = highlightQueryMatches(text, "quantum");

  assert.strictEqual(chunks.length, 4);
  assert.strictEqual(chunks[0].text, "Quantum");
  assert.strictEqual(chunks[0].match, true);
  assert.strictEqual(chunks[1].text, " physics explores ");
  assert.strictEqual(chunks[1].match, false);
  assert.strictEqual(chunks[2].text, "quantum");
  assert.strictEqual(chunks[2].match, true);
  assert.strictEqual(chunks[3].text, " non-locality.");
  assert.strictEqual(chunks[3].match, false);
});

test("generateSearchExcerpt creates contextual window around matching term", () => {
  const text = "A long scientific introduction precedes the key finding: the photon entanglement was confirmed with high precision.";
  const excerpt = generateSearchExcerpt(text, "entanglement", 40);

  assert.ok(excerpt.includes("entanglement"));
  assert.ok(excerpt.startsWith("..."));
});

test("calculateQueryRelevanceScore gives highest score to exact title matches", () => {
  const exactTitleScore = calculateQueryRelevanceScore(
    "Quantum Computing",
    "General discussion on quantum algorithms.",
    "Quantum Computing"
  );
  assert.ok(exactTitleScore >= 100);

  const partialTitleScore = calculateQueryRelevanceScore(
    "Intro to Quantum Computing Systems",
    "Content",
    "Quantum"
  );
  assert.ok(partialTitleScore >= 50);
});
