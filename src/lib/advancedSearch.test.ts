import test from "node:test";
import assert from "node:assert";
import {
  parseAdvancedQuery,
  evaluatePostMatch,
  executeAdvancedSearch
} from "./advancedSearch";
import { BlogPost } from "../types";

const mockPosts: BlogPost[] = [
  {
    id: "1",
    title: "Quantum Entanglement and Bell Inequalities",
    slug: "quantum-entanglement-bell",
    excerpt: "An exploration of quantum non-locality and entanglement verification.",
    content: "We analyze Einstein-Podolsky-Rosen paradox and state tomography in nanophotonics.",
    author: "Lucas Kempe, Alice Smith",
    tags: ["Quantum", "Optics", "Information"],
    date: "2026-03-15T10:00:00Z",
    readingTime: "5 min",
    arxivLink: "https://arxiv.org/abs/2603.11111",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "2",
    title: "Topological Phase Transitions in Condensed Matter",
    slug: "topological-phase-transitions",
    excerpt: "Mathematical formalisms for Berry curvature and Chern invariants.",
    content: "Chern numbers describe the quantized Hall conductance in 2D crystal lattices.",
    author: "Bob Vance",
    tags: ["Condensed Matter", "Topology", "Physics"],
    date: "2025-11-20T10:00:00Z",
    readingTime: "6 min",
    arxivLink: "https://arxiv.org/abs/2511.22222",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "3",
    title: "Cavity Optomechanics at the Single Photon Limit",
    slug: "cavity-optomechanics-single-photon",
    excerpt: "Coupling mechanical resonators with quantum optical modes.",
    content: "Radiation pressure and sideband cooling allow ground-state mechanical cooling.",
    author: "Lucas Kempe",
    tags: ["Optics", "Quantum", "Nanotechnology"],
    date: "2026-06-01T10:00:00Z",
    readingTime: "4 min",
    arxivLink: "https://arxiv.org/abs/2606.33333",
    bannerSvg: "<svg></svg>"
  }
];

test("parseAdvancedQuery extracts exact phrases in double quotes", () => {
  const query = 'quantum "state tomography" tag:optics';
  const parsed = parseAdvancedQuery(query);

  assert.deepStrictEqual(parsed.terms, ["quantum"]);
  assert.deepStrictEqual(parsed.exactPhrases, ["state tomography"]);
  assert.deepStrictEqual(parsed.tagFilters, ["optics"]);
});

test("parseAdvancedQuery handles excluded terms with minus prefix", () => {
  const query = 'quantum -condensed -hall';
  const parsed = parseAdvancedQuery(query);

  assert.deepStrictEqual(parsed.terms, ["quantum"]);
  assert.deepStrictEqual(parsed.excludedTerms, ["condensed", "hall"]);
});

test("parseAdvancedQuery parses author, year, and minread modifiers", () => {
  const query = 'author:"Lucas Kempe" year:2026 minread:3 tag:quantum';
  const parsed = parseAdvancedQuery(query);

  assert.strictEqual(parsed.authorFilter, "Lucas Kempe");
  assert.strictEqual(parsed.yearFilter, 2026);
  assert.strictEqual(parsed.minReadTime, 3);
  assert.deepStrictEqual(parsed.tagFilters, ["quantum"]);
});

test("evaluatePostMatch filters out posts with excluded terms", () => {
  const parsed = parseAdvancedQuery("quantum -paradox");
  const match1 = evaluatePostMatch(mockPosts[0], parsed); // Contains 'paradox' in content
  const match3 = evaluatePostMatch(mockPosts[2], parsed); // Does not contain 'paradox'

  assert.strictEqual(match1.matches, false, "Post with excluded term should not match");
  assert.strictEqual(match3.matches, true, "Post without excluded term should match");
});

test("evaluatePostMatch validates year and tag filters", () => {
  const parsed2026 = parseAdvancedQuery("year:2026 tag:topology");
  const match1 = evaluatePostMatch(mockPosts[1], parsed2026); // Published in 2025
  assert.strictEqual(match1.matches, false, "Year mismatch should fail");

  const parsed2025 = parseAdvancedQuery("year:2025 tag:topology");
  const match2 = evaluatePostMatch(mockPosts[1], parsed2025);
  assert.strictEqual(match2.matches, true, "Matching year and tag should succeed");
});

test("executeAdvancedSearch ranks title matches higher than content-only matches", () => {
  const results = executeAdvancedSearch(mockPosts, "quantum");
  assert.ok(results.length >= 2);
  // Posts with 'Quantum' in title should score high
  assert.strictEqual(results[0].post.id, "1");
  assert.ok(results[0].score > 0);
  assert.ok(results[0].matchedFields.includes("title"));
});

test("executeAdvancedSearch handles empty or invalid inputs safely", () => {
  const resEmptyQuery = executeAdvancedSearch(mockPosts, "");
  assert.strictEqual(resEmptyQuery.length, mockPosts.length);

  const resEmptyPosts = executeAdvancedSearch([], "quantum");
  assert.deepStrictEqual(resEmptyPosts, []);
});
