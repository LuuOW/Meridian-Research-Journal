import test from "node:test";
import assert from "node:assert";
import { executeAdvancedSearch, parseAdvancedQuery, ParsedSearchQuery } from "./advancedSearch";
import { getSearchSuggestions, filterBlogsIntelligently } from "./autocompleteUtils";
import { BlogPost } from "../types";

const sampleArticles: BlogPost[] = [
  {
    id: "pub-1",
    title: "Quantum Entanglement in Microcavity Polaritons",
    slug: "quantum-entanglement-microcavity-polaritons",
    excerpt: "Observation of macroscopic quantum coherence and polariton condensation at room temperature.",
    content: "Microcavity polaritons exhibit non-linear macroscopic wavefunctions governed by the Gross-Pitaevskii equation.",
    tags: ["Quantum Optics", "Photonics", "Condensed Matter"],
    author: "Lucas Kempe",
    date: "2026-05-10T00:00:00Z",
    readingTime: "7 min read",
    arxivLink: "https://arxiv.org/abs/2605.1001",
    bannerSvg: "<svg></svg>",
    views: 1420
  },
  {
    id: "pub-2",
    title: "Topological Protection of Bound States in Continuum Metamaterials",
    slug: "topological-protection-bound-states-continuum",
    excerpt: "Engineering non-radiating states in symmetry-broken dielectric metasurfaces.",
    content: "Bound states in the continuum (BICs) are localized states residing inside the radiation continuum with infinite Q-factor.",
    tags: ["Metamaterials", "Photonics", "Topology"],
    author: "Elena Vance",
    date: "2026-06-15T00:00:00Z",
    readingTime: "10 min read",
    arxivLink: "https://arxiv.org/abs/2606.2002",
    bannerSvg: "<svg></svg>",
    views: 2310
  },
  {
    id: "pub-3",
    title: "Deep Reinforcement Learning for Adaptive Wavefront Shaping",
    slug: "deep-reinforcement-learning-wavefront-shaping",
    excerpt: "Correcting severe optical scattering through turbid biological media using neural network controllers.",
    content: "Wavefront shaping through multiple scattering media enables sharp focal points via spatial light modulators.",
    tags: ["Wavefront Shaping", "AI", "Biophotonics"],
    author: "Lucas Kempe",
    date: "2026-07-20T00:00:00Z",
    readingTime: "5 min read",
    arxivLink: "https://arxiv.org/abs/2607.3003",
    bannerSvg: "<svg></svg>",
    views: 980
  },
  {
    id: "pub-4",
    title: "Two-Photon Absorption in High-Index Silicon Nanowires",
    slug: "two-photon-absorption-silicon-nanowires",
    excerpt: "Non-linear optical Kerr coefficients in sub-wavelength semiconductor waveguides.",
    content: "Two-photon absorption limits peak intensity but enables all-optical switching in silicon photonics circuits.",
    tags: ["Silicon Photonics", "Non-linear Optics"],
    author: "Marcus Brody",
    date: "2025-11-04T00:00:00Z",
    readingTime: "8 min read",
    arxivLink: "https://arxiv.org/abs/2511.4004",
    bannerSvg: "<svg></svg>",
    views: 870
  }
];

test("Advanced Search Query Parser: decomposes query strings with syntax modifiers", () => {
  const query1 = 'polariton "room temperature" -classical author:"Lucas Kempe" year:2026 minread:6';
  const parsed: ParsedSearchQuery = parseAdvancedQuery(query1);

  assert.deepStrictEqual(parsed.exactPhrases, ["room temperature"]);
  assert.deepStrictEqual(parsed.excludedTerms, ["classical"]);
  assert.strictEqual(parsed.authorFilter, "Lucas Kempe");
  assert.strictEqual(parsed.yearFilter, 2026);
  assert.strictEqual(parsed.minReadTime, 6);
  assert.ok(parsed.terms.includes("polariton"));
});

test("Advanced Search Engine: exact phrase filtering restricts matching scope", () => {
  // Query for 'Gross-Pitaevskii' which is in pub-1 only
  const results1 = executeAdvancedSearch(sampleArticles, '"Gross-Pitaevskii"');
  assert.strictEqual(results1.length, 1);
  assert.strictEqual(results1[0].post.id, "pub-1");

  // Query for non-existent phrase
  const resultsNone = executeAdvancedSearch(sampleArticles, '"laser ablation spectroscopy"');
  assert.strictEqual(resultsNone.length, 0);
});

test("Advanced Search Engine: negation '-' removes unwanted matches cleanly", () => {
  // Both pub-1 and pub-3 are authored by Lucas Kempe
  const allLucas = executeAdvancedSearch(sampleArticles, 'author:"Lucas Kempe"');
  assert.strictEqual(allLucas.length, 2);

  const lucasNoAI = executeAdvancedSearch(sampleArticles, 'author:"Lucas Kempe" -AI');
  assert.strictEqual(lucasNoAI.length, 1);
  assert.strictEqual(lucasNoAI[0].post.id, "pub-1");
});

test("Advanced Search Engine: scoring hierarchy prioritizes title matches over content", () => {
  const results = executeAdvancedSearch(sampleArticles, "wavefront");
  assert.ok(results.length > 0);
  assert.strictEqual(results[0].post.id, "pub-3");
  assert.ok(results[0].score >= 30, "Title match should receive elevated score");
});

test("Autocomplete Engine: generates relevant suggestions categorized by type", () => {
  const suggestions = getSearchSuggestions(sampleArticles, "polariton");
  assert.ok(suggestions.suggestions.length > 0);
  
  const articleSuggestion = suggestions.suggestions.find(s => s.type === "article");
  assert.ok(articleSuggestion, "Should find matching article suggestion");
  assert.strictEqual(articleSuggestion?.blogId, "pub-1");

  const tagSuggestions = getSearchSuggestions(sampleArticles, "Photonics");
  const photonicsTag = tagSuggestions.suggestions.find(s => s.type === "tag" && s.title.toLowerCase() === "photonics");
  assert.ok(photonicsTag, "Should find Photonics tag");
});

test("Autocomplete Engine: gracefully handles empty strings, symbols, and malformed inputs", () => {
  const emptyRes = getSearchSuggestions(sampleArticles, "");
  assert.ok(emptyRes.suggestions.length > 0, "Empty query returns curated suggestions");

  const symbolsRes = getSearchSuggestions(sampleArticles, "$$##@@!!\\//");
  assert.strictEqual(symbolsRes.totalMatches, 0);
  assert.ok(Array.isArray(symbolsRes.suggestions));

  const nullSafe = getSearchSuggestions(null as any, "quantum");
  assert.strictEqual(nullSafe.suggestions.length, 0);
});

test("FilterBlogsIntelligently: integrates tag filters and search queries seamlessly", () => {
  const matched = filterBlogsIntelligently(sampleArticles, "macroscopic", "Quantum Optics");
  assert.strictEqual(matched.length, 1);
  assert.strictEqual(matched[0].id, "pub-1");

  const noMatch = filterBlogsIntelligently(sampleArticles, "macroscopic", "Silicon Photonics");
  assert.strictEqual(noMatch.length, 0);
});
