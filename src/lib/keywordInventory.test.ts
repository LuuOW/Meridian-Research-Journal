import test from "node:test";
import assert from "node:assert";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";
import {
  STOPWORDS,
  KNOWN_SCIENTIFIC_PHRASES,
  normalizeKeywordTerm,
  tokenizeText,
  extractLatexSymbols,
  extractAcronyms,
  extractScientificPhrases,
  calculateIdf,
  calculateBM25,
  getArticleKeywordInventory,
  buildKeywordInventory,
  lookupKeyword,
  searchKeywords,
  findArticlesByKeywords,
  getKeywordAlphabeticalDirectory,
  exportKeywordDictionaryJson
} from "./keywordInventory";

test("normalizeKeywordTerm strips punctuation, diacritics, and normalizes casing", () => {
  assert.strictEqual(normalizeKeywordTerm("Quantum-Electrodynamics!"), "quantum-electrodynamics");
  assert.strictEqual(normalizeKeywordTerm("Schrödinger's Cat"), "schrodingers cat");
  assert.strictEqual(normalizeKeywordTerm("  \\mathcal{H}_{eff}  "), "\\mathcalh_eff");
  assert.strictEqual(normalizeKeywordTerm(""), "");
  assert.strictEqual(normalizeKeywordTerm("   "), "");
});

test("tokenizeText strips markdown syntax, URLs, stopwords, and short tokens", () => {
  const markdownSample = `
    # High-Q Bound States in Continuum
    Check the paper at https://arxiv.org/abs/2608.10001.
    We study **subwavelength** gratings using \`FDTD\` simulations:
    $$\\mathcal{H} \\psi = E \\psi$$
    Here is a [link to repository](https://github.com/lucas/physics).
  `;

  const tokens = tokenizeText(markdownSample);

  assert.ok(tokens.includes("high-q") || tokens.includes("bound") || tokens.includes("continuum"));
  assert.ok(tokens.includes("subwavelength"));
  assert.ok(tokens.includes("gratings"));
  assert.ok(tokens.includes("simulations"));
  // Stopwords and URLs must be removed
  assert.ok(!tokens.includes("the"));
  assert.ok(!tokens.includes("at"));
  assert.ok(!tokens.includes("we"));
  assert.ok(!tokens.some((t) => t.startsWith("http")));
});

test("extractLatexSymbols captures mathematical macros and variables", () => {
  const content = `
    The effective Hamiltonian is given by:
    $$\\mathcal{H}_{eff} = \\omega_0 - i \\gamma_{rad} + \\sum_k \\frac{|g_k|^2}{\\Delta_k}$$
    In the presence of non-linear vacuum field $\\varepsilon_0 \\mathbf{E}^2$, we evaluate $\\psi(x, t)$.
  `;

  const symbols = extractLatexSymbols(content);

  assert.ok(symbols.some((s) => s.includes("mathcal")));
  assert.ok(symbols.some((s) => s.includes("gamma") || s.includes("omega")));
  assert.ok(symbols.some((s) => s.includes("varepsilon") || s.includes("mathbf")));
  assert.ok(symbols.some((s) => s.includes("psi")));
  // Common layout wrappers shouldn't pollute
  assert.ok(!symbols.includes("\\frac"));
});

test("extractAcronyms extracts capitalized scientific acronyms", () => {
  const text = "We demonstrate that BICs in SWG structures exhibit high Q-factors. The QED and SLRs dynamics improve PAM.";
  const acronyms = extractAcronyms(text);

  assert.ok(acronyms.includes("BICs") || acronyms.includes("BIC"));
  assert.ok(acronyms.includes("SWG"));
  assert.ok(acronyms.includes("QED"));
  assert.ok(acronyms.includes("SLRs"));
  assert.ok(acronyms.includes("PAM"));
  // Excluded generic words
  assert.ok(!acronyms.includes("THE"));
  assert.ok(!acronyms.includes("AND"));
});

test("extractScientificPhrases extracts known domain phrases and multi-word scientific concepts", () => {
  const text = "This work investigates bound states in the continuum and wavefront shaping using Euler-Heisenberg Lagrangian in topological photonics.";
  const phrases = extractScientificPhrases(text);

  assert.ok(phrases.includes("bound states in the continuum"));
  assert.ok(phrases.includes("wavefront shaping"));
  assert.ok(phrases.includes("topological photonics"));
  assert.ok(phrases.some((p) => p.includes("Euler-Heisenberg")));
});

test("calculateIdf adheres to mathematical bounds and monotonicity", () => {
  const totalDocs = 100;
  const idfRare = calculateIdf(1, totalDocs);
  const idfMedium = calculateIdf(10, totalDocs);
  const idfCommon = calculateIdf(50, totalDocs);
  const idfUbiquitous = calculateIdf(100, totalDocs);

  // Invariant: IDF must strictly decrease as Document Frequency (DF) increases
  assert.ok(idfRare > idfMedium, `idfRare (${idfRare}) should > idfMedium (${idfMedium})`);
  assert.ok(idfMedium > idfCommon, `idfMedium (${idfMedium}) should > idfCommon (${idfCommon})`);
  assert.ok(idfCommon > idfUbiquitous, `idfCommon (${idfCommon}) should > idfUbiquitous (${idfUbiquitous})`);
  assert.ok(idfUbiquitous > 0, "Smoothed IDF must remain positive");

  // Zero handling
  assert.strictEqual(calculateIdf(0, totalDocs), 0);
  assert.strictEqual(calculateIdf(5, 0), 0);
});

test("calculateBM25 satisfies saturation and document length normalization", () => {
  const totalDocs = 64;
  const avgDocLength = 500;
  const df = 5;

  const score1 = calculateBM25(1, 500, avgDocLength, df, totalDocs);
  const score5 = calculateBM25(5, 500, avgDocLength, df, totalDocs);
  const score20 = calculateBM25(20, 500, avgDocLength, df, totalDocs);

  // Diminishing returns: score5 - score1 > score20 - score5 (per unit term count)
  assert.ok(score5 > score1);
  assert.ok(score20 > score5);
  const delta1to5 = (score5 - score1) / 4;
  const delta5to20 = (score20 - score5) / 15;
  assert.ok(delta1to5 > delta5to20, "BM25 must exhibit diminishing returns with term frequency saturation");

  // Document length penalty: longer document with same TF gets lower density score
  const scoreShortDoc = calculateBM25(3, 200, avgDocLength, df, totalDocs);
  const scoreLongDoc = calculateBM25(3, 1000, avgDocLength, df, totalDocs);
  assert.ok(scoreShortDoc > scoreLongDoc, "Shorter document should have higher term density score in BM25");
});

test("getArticleKeywordInventory generates complete keyword profile for an article", () => {
  const sampleArticle: BlogPost = {
    id: "sample-art-1",
    title: "Observation of Bound States in Continuum in Metamaterials",
    slug: "observation-bic-metamaterials",
    excerpt: "Experimental demonstration of topological BIC resonances.",
    date: "2026-08-31",
    readingTime: "6 min read",
    arxivLink: "https://arxiv.org/abs/2608.12345",
    bannerSvg: "<svg></svg>",
    author: "Lucas Kempe",
    tags: ["Metamaterials", "Optics", "Topology"],
    content: `
      ## Introduction
      We observe bound states in the continuum (BIC) with ultra-high quality factor $Q > 10^5$.
      The scattering matrix is parameterized by $\\mathcal{S}(k) = \\mathbb{I} - i \\mathcal{K}$.
      Polarization vectors exhibit vortex singularity with topological charge $q = +1$.
    `
  };

  const inventory = getArticleKeywordInventory(sampleArticle);

  assert.strictEqual(inventory.articleId, "sample-art-1");
  assert.strictEqual(inventory.slug, "observation-bic-metamaterials");
  assert.strictEqual(inventory.primaryDomain, "Metamaterials");
  assert.ok(inventory.totalWordCount > 0);
  assert.ok(inventory.uniqueKeywordCount > 0);
  assert.ok(inventory.topKeywords.length > 0);

  // Top keywords should contain title and tag terms with high weight
  const topTerms = inventory.topKeywords.map((k) => k.normalizedTerm);
  assert.ok(topTerms.includes("metamaterials"));
  assert.ok(topTerms.includes("optics") || topTerms.includes("continuum"));
  assert.ok(topTerms.includes("bound") || topTerms.includes("states"));

  // Check LaTeX symbols and acronyms
  assert.ok(inventory.latexSymbolCount > 0);
  assert.ok(inventory.tags.includes("Metamaterials"));
  assert.ok(inventory.acronyms.includes("BIC"));
});

test("buildKeywordInventory constructs an inverted index and dictionary over a sample collection", () => {
  const articles: BlogPost[] = [
    {
      id: "art-1",
      title: "Non-Hermitian Waveguide Arrays and Exceptional Points",
      slug: "non-hermitian-waveguide-arrays",
      excerpt: "Dynamics near exceptional points.",
      date: "2026-08-01",
      readingTime: "5 min read",
      arxivLink: "https://arxiv.org/abs/2608.00001",
      bannerSvg: "<svg></svg>",
      author: "Lucas Kempe",
      tags: ["Photonics", "Non-Hermitian"],
      content: "Exceptional points occur when eigenvalues coalesce in non-Hermitian Hamiltonians $\\mathcal{H}$."
    },
    {
      id: "art-2",
      title: "Quantum Error Correction via Subsystem Surface Codes",
      slug: "quantum-error-correction-surface-codes",
      excerpt: "Fault-tolerant threshold bounds.",
      date: "2026-08-02",
      readingTime: "7 min read",
      arxivLink: "https://arxiv.org/abs/2608.00002",
      bannerSvg: "<svg></svg>",
      author: "Lucas Kempe",
      tags: ["Quantum", "Fault-Tolerance"],
      content: "Subsystem codes achieve fault tolerance through syndrome extraction and stabilizer measurement."
    },
    {
      id: "art-3",
      title: "Topological Photonic Crystals and Edge State Transport",
      slug: "topological-photonic-crystals",
      excerpt: "Robust unidirectional transmission.",
      date: "2026-08-03",
      readingTime: "6 min read",
      arxivLink: "https://arxiv.org/abs/2608.00003",
      bannerSvg: "<svg></svg>",
      author: "Lucas Kempe",
      tags: ["Photonics", "Topology"],
      content: "Photonic crystal waveguides exhibit helical edge states protected by non-trivial Chern number."
    }
  ];

  const dictionary = buildKeywordInventory(articles);

  assert.strictEqual(dictionary.totalArticles, 3);
  assert.ok(dictionary.totalCorpusWords > 0);
  assert.ok(dictionary.totalUniqueKeywords > 10);
  assert.ok(dictionary.averageDocumentLength > 0);

  // Inverted index validation for "photonics" (appears in art-1 and art-3)
  const photonicsEntry = lookupKeyword("photonics", dictionary);
  assert.ok(photonicsEntry !== null);
  assert.strictEqual(photonicsEntry!.documentFrequency, 2);
  assert.strictEqual(photonicsEntry!.postings.length, 2);
  assert.ok(photonicsEntry!.postings.some((p) => p.articleId === "art-1"));
  assert.ok(photonicsEntry!.postings.some((p) => p.articleId === "art-3"));

  // Inverted index validation for "quantum" (appears only in art-2)
  const quantumEntry = lookupKeyword("quantum", dictionary);
  assert.ok(quantumEntry !== null);
  assert.strictEqual(quantumEntry!.documentFrequency, 1);
  assert.strictEqual(quantumEntry!.postings[0].articleId, "art-2");

  // Invariant: every entry's documentFrequency matches its postings count
  for (const entry of Object.values(dictionary.entries)) {
    assert.strictEqual(
      entry.documentFrequency,
      entry.postings.length,
      `Posting count mismatch for term: ${entry.term}`
    );
  }
});

test("buildKeywordInventory operates deterministically across all PRELOADED_BLOGS", () => {
  const dictionary = buildKeywordInventory(PRELOADED_BLOGS);

  assert.strictEqual(dictionary.totalArticles, PRELOADED_BLOGS.length);
  assert.ok(dictionary.totalArticles >= 64, `Expected at least 64 preloaded articles, found ${dictionary.totalArticles}`);
  assert.ok(dictionary.totalCorpusWords > 5000, `Corpus word count ${dictionary.totalCorpusWords} should be large`);
  assert.ok(dictionary.totalUniqueKeywords > 500, `Unique keyword count ${dictionary.totalUniqueKeywords} should be rich`);

  // Verify article inventories exist for every preloaded article
  for (const blog of PRELOADED_BLOGS) {
    const inv = dictionary.articlesInventory[blog.id];
    assert.ok(inv !== undefined, `Missing article inventory for article ID: ${blog.id}`);
    assert.strictEqual(inv.articleId, blog.id);
    assert.strictEqual(inv.title, blog.title);
    assert.ok(inv.topKeywords.length > 0, `Top keywords should not be empty for: ${blog.id}`);
  }

  // Verify top keywords by score
  assert.ok(dictionary.topKeywordsByScore.length > 0);
  assert.ok(dictionary.topKeywordsByScore.length <= 100);

  // Core physics keywords must exist in the dictionary
  const coreTerms = ["quantum", "optics", "metamaterials", "waveguide", "scattering", "energy"];
  for (const term of coreTerms) {
    const entry = lookupKeyword(term, dictionary);
    assert.ok(entry !== null, `Core physics keyword '${term}' should exist in global dictionary`);
    assert.ok(entry!.documentFrequency >= 1, `Keyword '${term}' should have DF >= 1`);
  }
});

test("lookupKeyword and searchKeywords provide precise and prefix-ranked lookups", () => {
  const dictionary = buildKeywordInventory(PRELOADED_BLOGS);

  // Exact lookup
  const exact = lookupKeyword("Optics", dictionary);
  assert.ok(exact !== null);
  assert.strictEqual(exact!.normalizedTerm, "optics");

  // Non-existent lookup
  const missing = lookupKeyword("non_existent_super_califragilistic", dictionary);
  assert.strictEqual(missing, null);

  // Prefix search
  const results = searchKeywords("quant", dictionary, 10);
  assert.ok(results.length > 0);
  assert.ok(results.some((r) => r.normalizedTerm.startsWith("quant")));
  // First result should be exact match or top frequency prefix
  assert.strictEqual(results[0].normalizedTerm, "quantum");

  // Empty query handling
  assert.deepStrictEqual(searchKeywords("", dictionary), []);
});

test("findArticlesByKeywords retrieves and ranks articles with matching metrics", () => {
  const dictionary = buildKeywordInventory(PRELOADED_BLOGS);

  // Multi-term query (OR search)
  const resultsOr = findArticlesByKeywords(["waveguide", "polarization"], dictionary, { limit: 5 });
  assert.ok(resultsOr.length > 0);
  assert.ok(resultsOr.length <= 5);
  for (let i = 0; i < resultsOr.length - 1; i++) {
    assert.ok(
      resultsOr[i].totalScore >= resultsOr[i + 1].totalScore,
      "Ranked results must be ordered in descending order of total score"
    );
  }

  // Exact AND search (all terms required)
  const resultsAnd = findArticlesByKeywords(["quantum", "optics"], dictionary, { matchAll: true });
  for (const r of resultsAnd) {
    assert.ok(r.matchedKeywords.some((k) => k.toLowerCase().includes("quantum")));
    assert.ok(r.matchedKeywords.some((k) => k.toLowerCase().includes("optic")));
  }
});

test("getKeywordAlphabeticalDirectory correctly categorizes terms into A-Z groups", () => {
  const dictionary = buildKeywordInventory(PRELOADED_BLOGS);
  const alphaDir = getKeywordAlphabeticalDirectory(dictionary);

  assert.ok(Object.keys(alphaDir).length > 10, "Alphabetical directory should contain multiple letters");

  if (alphaDir["Q"]) {
    for (const entry of alphaDir["Q"]) {
      assert.ok(
        entry.normalizedTerm.startsWith("q"),
        `Entry '${entry.normalizedTerm}' under letter 'Q' must start with 'q'`
      );
    }
  }

  if (alphaDir["M"]) {
    for (const entry of alphaDir["M"]) {
      assert.ok(
        entry.normalizedTerm.startsWith("m"),
        `Entry '${entry.normalizedTerm}' under letter 'M' must start with 'm'`
      );
    }
  }
});

test("exportKeywordDictionaryJson exports valid JSON serializable structure", () => {
  const dictionary = buildKeywordInventory(PRELOADED_BLOGS.slice(0, 5));
  const jsonStr = exportKeywordDictionaryJson(dictionary);

  assert.ok(typeof jsonStr === "string");
  assert.ok(jsonStr.length > 100);

  const parsed = JSON.parse(jsonStr);
  assert.strictEqual(parsed.totalArticles, 5);
  assert.ok(parsed.totalCorpusWords > 0);
  assert.ok(typeof parsed.entries === "object");
  assert.ok(typeof parsed.articlesInventory === "object");
  assert.ok(typeof parsed.alphabeticalIndex === "object");
});

test("Related keywords computation produces valid Jaccard similarities in range [0, 1]", () => {
  const dictionary = buildKeywordInventory(PRELOADED_BLOGS);

  for (const entry of Object.values(dictionary.entries).slice(0, 50)) {
    for (const rel of entry.relatedKeywords) {
      assert.ok(
        rel.similarity >= 0 && rel.similarity <= 1,
        `Jaccard similarity ${rel.similarity} for '${entry.term}' -> '${rel.term}' must be within [0, 1]`
      );
    }
  }
});
