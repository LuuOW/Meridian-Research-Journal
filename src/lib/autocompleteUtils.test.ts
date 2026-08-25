import test from "node:test";
import assert from "node:assert";
import { getSearchSuggestions, filterBlogsIntelligently } from "./autocompleteUtils.js";
import { BlogPost } from "../types.js";

const mockBlogs: BlogPost[] = [
  {
    id: "blog-1",
    title: "Classical versus non-classical photon states",
    slug: "classical-versus-non-classical-photon-states",
    excerpt: "Quantum optics and photon statistics in non-linear media.",
    content: "We explore the quantum coherence and non-classical states of light using SPDC sources.",
    tags: ["Quantum Optics", "Photonics", "Quantum Information"],
    author: "Lucas Kempe",
    date: "2026-05-01T00:00:00Z",
    readingTime: "6 min read",
    arxivLink: "https://arxiv.org/abs/2605.0001",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "blog-2",
    title: "Artificial Anisotropy Induced Bound States in the Continuum",
    slug: "artificial-anisotropy-induced-bound-states",
    excerpt: "Bound states in the continuum (BICs) through engineered anisotropy.",
    content: "Anisotropic metamaterials enable symmetry-protected bound states in photonic crystal slabs.",
    tags: ["Metamaterials", "Photonics", "Condensed Matter"],
    author: "Elena Vance",
    date: "2026-05-02T00:00:00Z",
    readingTime: "8 min read",
    arxivLink: "https://arxiv.org/abs/2605.0002",
    bannerSvg: "<svg></svg>"
  }
];

test("getSearchSuggestions returns default curated concepts and tags for empty query", () => {
  const result = getSearchSuggestions(mockBlogs, "");
  assert.ok(result.suggestions.length > 0);
  assert.strictEqual(result.totalMatches, 2);
  const tagSuggestions = result.suggestions.filter(s => s.type === "tag");
  assert.ok(tagSuggestions.length > 0);
});

test("getSearchSuggestions finds matching tags and concepts for query 'photon'", () => {
  const result = getSearchSuggestions(mockBlogs, "photon");
  assert.ok(result.suggestions.length > 0);
  const titles = result.suggestions.map(s => s.title.toLowerCase());
  assert.ok(titles.some(t => t.includes("photon")));
  assert.ok(result.totalMatches >= 1);
});

test("getSearchSuggestions finds matching articles for query 'Bound States'", () => {
  const result = getSearchSuggestions(mockBlogs, "Bound States");
  const articleSuggestion = result.suggestions.find(s => s.type === "article" || s.type === "concept");
  assert.ok(articleSuggestion);
});

test("filterBlogsIntelligently ranks and returns matching blogs", () => {
  const filtered = filterBlogsIntelligently(mockBlogs, "anisotropy");
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, "blog-2");
});

test("filterBlogsIntelligently respects tag filter alongside query", () => {
  const filtered = filterBlogsIntelligently(mockBlogs, "photon", "Quantum Optics");
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, "blog-1");
});

test("filterBlogsIntelligently returns all active blogs when query and tag are empty", () => {
  const filtered = filterBlogsIntelligently(mockBlogs, "", null);
  assert.strictEqual(filtered.length, 2);
});
